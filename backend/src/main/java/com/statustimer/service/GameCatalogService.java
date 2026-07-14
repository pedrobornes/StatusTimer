package com.statustimer.service;

import com.statustimer.config.CatalogDiscoveryPolicy;
import com.statustimer.config.CatalogMatureContentPolicy;
import com.statustimer.config.CatalogNoisePolicy;
import com.statustimer.config.GameAssetPolicy;
import com.statustimer.config.CacheConfig;
import com.statustimer.config.GameSlugMapper;
import com.statustimer.config.KnownSteamAppRegistry;
import com.statustimer.config.ManualProtectedCatalogPolicy;
import com.statustimer.config.PinnedGamePolicy;
import com.statustimer.config.SteamAppIdPolicy;
import com.statustimer.config.SteamMetadataRefreshPolicy;
import com.statustimer.config.TrackedGameCatalog;
import com.statustimer.dto.request.GameCatalogEntryPayload;
import com.statustimer.dto.request.SyncGameCatalogRequest;
import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.dto.response.GameIndexableSlugResponse;
import com.statustimer.dto.response.SyncGameCatalogResponse;
import com.statustimer.config.GameTypeResolver;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameType;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import com.statustimer.integration.SteamStoreAppDetailsClient;
import com.statustimer.integration.SteamStoreAppDetailsClient.SteamAppMetadata;
import com.statustimer.dto.response.SteamStoreListingResponse;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryHistoryRepository;
import com.statustimer.repository.GameTelemetryRepository;
import com.statustimer.repository.GamingNewsRepository;
import com.statustimer.repository.TelemetryDailyRollupRepository;
import com.statustimer.util.IgdbMetadataSupport;
import com.statustimer.util.SearchQuerySupport;
import com.statustimer.util.SlugUtils;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameCatalogService {

    private static final int STARTUP_STEAM_ENRICH_LIMIT = 10;
    private static final int STARTUP_IGDB_ENRICH_LIMIT = 6;

    private static final int IGDB_DISCOVERY_LIMIT = 8;

    private final GameRepository gameRepository;
    private final GameTelemetryRepository gameTelemetryRepository;
    private final GameTelemetryHistoryRepository gameTelemetryHistoryRepository;
    private final TelemetryDailyRollupRepository telemetryDailyRollupRepository;
    private final GamingNewsRepository gamingNewsRepository;
    private final IgdbSearchClient igdbSearchClient;
    private final GameSlugMapper gameSlugMapper;
    private final KnownSteamAppRegistry knownSteamAppRegistry;
    private final IndexabilityService indexabilityService;
    private final SteamStoreAppDetailsClient steamStoreAppDetailsClient;
    private final SteamMetadataRefreshPolicy steamMetadataRefreshPolicy;
    private final PlatformTransactionManager transactionManager;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.INDEXABLE_SLUGS_CACHE)
    public List<GameIndexableSlugResponse> findIndexableSlugs() {
        return gameRepository.findByIsIndexableTrueOrderBySlugAsc().stream()
                .filter(game -> gameSlugMapper.isCanonicalCatalogSlug(game.getSlug()))
                .map(game -> new GameIndexableSlugResponse(
                        game.getSlug(),
                        game.getLastTelemetryAt() != null
                                ? game.getLastTelemetryAt()
                                : LocalDateTime.now(),
                        true
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Game> findBySlug(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        return gameRepository.findBySlug(canonicalSlug);
    }

    @Transactional(readOnly = true)
    public boolean isFeatured(String slug) {
        return findBySlug(slug)
                .map(Game::getFeatured)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public String resolveGameName(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        return findBySlug(slug)
                .map(Game::getGameName)
                .orElseGet(() -> formatSlugLabel(canonicalSlug));
    }

    @Transactional(readOnly = true)
    public Integer resolveAppId(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);

        Optional<Integer> pinnedAppId = PinnedGamePolicy.findBySlug(canonicalSlug)
                .map(PinnedGamePolicy.Pin::steamAppId);
        if (pinnedAppId.isPresent()) {
            return pinnedAppId.get();
        }

        Integer trackedAppId = TrackedGameCatalog.resolveAppId(canonicalSlug);
        if (trackedAppId != null && trackedAppId > 0) {
            return trackedAppId;
        }

        return findBySlug(slug)
                .map(Game::getSteamAppId)
                .filter(appId -> appId != null && appId > 0)
                .filter(appId -> !PinnedGamePolicy.isBlockedSteamAppId(canonicalSlug, appId))
                .or(() -> knownSteamAppRegistry.resolveAppId(canonicalSlug))
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public Integer resolveTwitchRank(String slug) {
        return findBySlug(slug)
                .map(Game::getTwitchRank)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public java.time.LocalDate resolveSteamReleaseDate(String slug) {
        return findBySlug(slug)
                .map(Game::getSteamReleaseDate)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean isSteamAdultContent(String slug) {
        return findBySlug(slug)
                .map(Game::getSteamAdultContent)
                .orElse(false);
    }

    @Transactional
    public SteamStoreListingResponse resolveSteamStoreListing(String slug) {
        Integer appId = resolveAppId(slug);
        if (appId == null || appId <= 0) {
            return null;
        }

        Optional<Game> gameOpt = findBySlug(slug);
        if (gameOpt.isEmpty()) {
            return steamStoreAppDetailsClient.fetchMetadata(appId)
                    .map(metadata -> toSteamStoreListing(appId, metadata))
                    .orElse(null);
        }

        Game game = gameOpt.get();
        if (hasSteamStoreListing(game)) {
            return toSteamStoreListing(game);
        }

        Optional<SteamAppMetadata> metadata = steamStoreAppDetailsClient.fetchMetadata(appId);
        if (metadata.isEmpty()) {
            return null;
        }

        applySteamMetadata(game, metadata.get());
        gameRepository.save(game);
        return toSteamStoreListing(game);
    }

    private boolean hasSteamStoreListing(Game game) {
        return (game.getSteamShortDescription() != null && !game.getSteamShortDescription().isBlank())
                || game.getSteamPriceFinal() != null
                || Boolean.TRUE.equals(game.getSteamFreeToPlay());
    }

    private void applySteamMetadata(Game game, SteamAppMetadata metadata) {
        if (metadata.shortDescription() != null && !metadata.shortDescription().isBlank()) {
            game.setSteamShortDescription(metadata.shortDescription());
        }
        if (metadata.priceFinal() != null) {
            game.setSteamPriceFinal(metadata.priceFinal());
        }
        if (metadata.currency() != null && !metadata.currency().isBlank()) {
            game.setSteamCurrency(metadata.currency());
        }
        game.setSteamWindows(metadata.windows());
        game.setSteamMac(metadata.mac());
        game.setSteamLinux(metadata.linux());
        game.setSteamFreeToPlay(metadata.freeToPlay());

        if (metadata.releaseDate() != null && game.getSteamReleaseDate() == null) {
            game.setSteamReleaseDate(metadata.releaseDate());
        }
        if (metadata.adultContent()) {
            game.setSteamAdultContent(true);
        } else {
            game.setSteamAdultContent(false);
        }

        GameType resolvedType = GameTypeResolver.resolveFromSteamCategoryIds(metadata.categoryIds());
        if (resolvedType != null) {
            game.setGameType(resolvedType);
        }

        CatalogMatureContentPolicy.applyQuarantineIfMature(game);
        SteamAppIdPolicy.sanitize(game);
    }

    private void applyPinnedGameType(Game game) {
        GameType pinnedType = GameTypeResolver.resolvePinnedSlug(game.getSlug());
        if (pinnedType != null) {
            game.setGameType(pinnedType);
        }
    }

    private void refreshSteamStoreMetadata(Game game) {
        Integer appId = game.getSteamAppId();
        if (appId == null || appId <= 0) {
            CatalogMatureContentPolicy.applyQuarantineIfMature(game);
            return;
        }

        steamStoreAppDetailsClient.fetchMetadata(appId).ifPresentOrElse(
                metadata -> applySteamMetadata(game, metadata),
                () -> CatalogMatureContentPolicy.applyQuarantineIfMature(game)
        );
    }

    private SteamStoreListingResponse toSteamStoreListing(Game game) {
        Integer appId = game.getSteamAppId();
        if (appId == null || appId <= 0) {
            return null;
        }

        return new SteamStoreListingResponse(
                appId,
                game.getSteamShortDescription(),
                game.getSteamPriceFinal(),
                game.getSteamCurrency(),
                Boolean.TRUE.equals(game.getSteamWindows()),
                Boolean.TRUE.equals(game.getSteamMac()),
                Boolean.TRUE.equals(game.getSteamLinux()),
                Boolean.TRUE.equals(game.getSteamFreeToPlay())
        );
    }

    private SteamStoreListingResponse toSteamStoreListing(int appId, SteamAppMetadata metadata) {
        return new SteamStoreListingResponse(
                appId,
                metadata.shortDescription(),
                metadata.priceFinal(),
                metadata.currency(),
                metadata.windows(),
                metadata.mac(),
                metadata.linux(),
                metadata.freeToPlay()
        );
    }

    private void applySteamStoreFields(Game game, GameCatalogEntryPayload payload) {
        if (payload == null) {
            return;
        }

        if (payload.steamShortDescription() != null && !payload.steamShortDescription().isBlank()) {
            game.setSteamShortDescription(payload.steamShortDescription());
        }
        if (payload.steamPriceFinal() != null) {
            game.setSteamPriceFinal(payload.steamPriceFinal());
        }
        if (payload.steamCurrency() != null && !payload.steamCurrency().isBlank()) {
            game.setSteamCurrency(payload.steamCurrency());
        }
        if (payload.steamWindows() != null) {
            game.setSteamWindows(payload.steamWindows());
        }
        if (payload.steamMac() != null) {
            game.setSteamMac(payload.steamMac());
        }
        if (payload.steamLinux() != null) {
            game.setSteamLinux(payload.steamLinux());
        }
        if (payload.steamFreeToPlay() != null) {
            game.setSteamFreeToPlay(payload.steamFreeToPlay());
        }
    }

    @Transactional(readOnly = true)
    public Long resolveLivePlayers(String slug) {
        return findBySlug(slug)
                .filter(game -> game.getSteamAppId() != null && game.getSteamAppId() > 0)
                .map(Game::getLivePlayers)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean canTrackSteamPlayers(String slug) {
        if (SteamAppIdPolicy.suppressesSteamPlayerTracking(slug)) {
            return false;
        }

        return findBySlug(slug)
                .map(game -> game.getSteamAppId() != null && game.getSteamAppId() > 0)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public GameType resolveGameType(String slug) {
        return findBySlug(slug)
                .map(Game::getGameType)
                .orElse(GameType.MULTIPLAYER);
    }

    @Transactional(readOnly = true)
    public Long resolveTwitchViewers(String slug) {
        return findBySlug(slug)
                .map(Game::getTwitchViewers)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String resolveTwitchGameId(String slug) {
        return findBySlug(slug)
                .map(Game::getTwitchGameId)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String resolveLogoUrl(String slug, String fallbackLogoUrl) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        Optional<Game> tracked = findBySlug(slug);

        String persisted = tracked.map(Game::getLogoUrl).orElse(null);
        String resolved = GameAssetPolicy.resolveLogoUrl(canonicalSlug, persisted);
        if (GameAssetPolicy.isRenderableLogo(resolved)
                && GameAssetPolicy.isSuitableHeroUrl(resolved)) {
            return resolved;
        }

        Optional<String> pinnedHero = PinnedGamePolicy.findBySlug(canonicalSlug)
                .map(PinnedGamePolicy.Pin::fallbackLogoUrl)
                .map(GameAssetPolicy::sanitizeImageUrl)
                .filter(GameAssetPolicy::isSuitableHeroUrl);
        if (pinnedHero.isPresent()) {
            return pinnedHero.get();
        }

        String fallback = GameAssetPolicy.sanitizeImageUrl(fallbackLogoUrl);
        if (fallback != null && GameAssetPolicy.isSuitableHeroUrl(fallback)) {
            return fallback;
        }

        return GameAssetPolicy.LOGO_NONE;
    }

    @Transactional(readOnly = true)
    public String resolveCoverUrl(String slug, String fallbackCoverUrl) {
        Optional<Game> tracked = findBySlug(slug);
        if (tracked.isPresent()) {
            String coverUrl = GameAssetPolicy.sanitizeImageUrl(tracked.get().getCoverUrl());
            if (coverUrl != null) {
                return coverUrl;
            }
        }

        return GameAssetPolicy.sanitizeImageUrl(fallbackCoverUrl);
    }

    @Transactional
    public List<GameCatalogSearchResponse> search(String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }

        List<GameCatalogSearchResponse> results = new ArrayList<>();
        Set<String> seenSlugs = new LinkedHashSet<>();

        appendLocalMatches(trimmed, results, seenSlugs);
        appendTrackedCatalogMatches(trimmed, results, seenSlugs);

        int remaining = IGDB_DISCOVERY_LIMIT - results.size();
        if (remaining > 0
                && igdbSearchClient.isConfigured()
                && !ManualProtectedCatalogPolicy.isExactProtectedTitleQuery(trimmed)) {
            try {
                appendIgdbDiscoveryMatches(trimmed, results, seenSlugs, remaining);
            } catch (RuntimeException exception) {
                log.warn("IGDB discovery failed during search for '{}'", trimmed, exception);
            }
        }

        return results;
    }

    private void appendIgdbDiscoveryMatches(
            String query,
            List<GameCatalogSearchResponse> results,
            Set<String> seenSlugs,
            int limit
    ) {
        int added = appendUpsertedIgdbMatches(igdbSearchClient.search(query, limit), query, results, seenSlugs);
        if (added >= limit) {
            return;
        }

        appendDirectIgdbLookupMatches(query, results, seenSlugs, limit - added);
    }

    private void appendDirectIgdbLookupMatches(
            String query,
            List<GameCatalogSearchResponse> results,
            Set<String> seenSlugs,
            int limit
    ) {
        List<IgdbGameMatch> directMatches = new ArrayList<>();

        parseSteamAppIdQuery(query).ifPresent(appId ->
                igdbSearchClient.lookupBySteamAppId(appId).ifPresent(directMatches::add));

        if (directMatches.size() < limit) {
            String slugQuery = SlugUtils.toSlug(query);
            if (!slugQuery.isBlank()) {
                igdbSearchClient.lookupBySlug(slugQuery).ifPresent(match -> {
                    if (directMatches.stream().noneMatch(existing -> existing.igdbId() == match.igdbId())) {
                        directMatches.add(match);
                    }
                });

                SlugUtils.toIgdbPossessiveSlugVariant(slugQuery)
                        .flatMap(igdbSearchClient::lookupBySlug)
                        .ifPresent(match -> {
                            if (directMatches.stream().noneMatch(existing -> existing.igdbId() == match.igdbId())) {
                                directMatches.add(match);
                            }
                        });
            }
        }

        appendUpsertedIgdbMatches(directMatches.stream().limit(limit).toList(), query, results, seenSlugs);
    }

    private int appendUpsertedIgdbMatches(
            List<IgdbGameMatch> matches,
            String query,
            List<GameCatalogSearchResponse> results,
            Set<String> seenSlugs
    ) {
        int added = 0;
        Set<Long> seenIgdbIds = new LinkedHashSet<>();

        for (IgdbGameMatch match : matches) {
            if (match.igdbId() > 0 && !seenIgdbIds.add(match.igdbId())) {
                continue;
            }

            try {
                Game discovered = upsertFromIgdbDiscoveryIsolated(match);
                if (discovered == null
                        || CatalogNoisePolicy.shouldSkipCatalogSurfacing(discovered)) {
                    continue;
                }

                if (addSearchResult(discovered, results, seenSlugs)) {
                    added++;
                }
            } catch (RuntimeException exception) {
                log.warn(
                        "Skipping IGDB discovery match '{}' during search for '{}'",
                        match.name(),
                        query,
                        exception
                );
            }
        }

        return added;
    }

    private Game upsertFromIgdbDiscoveryIsolated(IgdbGameMatch match) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        try {
            return template.execute(status -> upsertFromIgdbDiscovery(match));
        } catch (DataIntegrityViolationException exception) {
            log.debug(
                    "IGDB discovery slug collision for '{}'; reloading existing catalog row",
                    match.name()
            );
            return resolveExistingGameForIgdbMatch(match)
                    .map(this::reloadGameWithPlatforms)
                    .orElse(null);
        }
    }

    private Optional<Integer> parseSteamAppIdQuery(String query) {
        if (query == null || !query.matches("\\d{1,10}")) {
            return Optional.empty();
        }

        try {
            int appId = Integer.parseInt(query);
            return appId > 0 ? Optional.of(appId) : Optional.empty();
        } catch (NumberFormatException ignored) {
            return Optional.empty();
        }
    }

    private void appendLocalMatches(
            String query,
            List<GameCatalogSearchResponse> results,
            Set<String> seenSlugs
    ) {
        LinkedHashSet<Long> candidateIds = new LinkedHashSet<>();
        List<Game> candidates = new ArrayList<>();

        String slugQuery = SlugUtils.toSlug(query);
        appendUniqueGames(candidates, candidateIds, gameRepository
                .findByGameNameContainingIgnoreCaseOrSlugContainingIgnoreCase(
                        query,
                        slugQuery.isBlank() ? query : slugQuery
                ));

        for (String variant : SearchQuerySupport.searchVariants(query)) {
            if (variant.equalsIgnoreCase(query.trim())) {
                continue;
            }

            appendUniqueGames(candidates, candidateIds,
                    gameRepository.findByGameNameContainingIgnoreCase(variant));
        }

        if (!slugQuery.isBlank()) {
            appendUniqueGames(candidates, candidateIds,
                    gameRepository.findBySlugContainingIgnoreCase(slugQuery));
        }

        for (Game game : candidates) {
            if (!SearchQuerySupport.matchesCatalogQuery(query, game.getGameName(), game.getSlug())) {
                continue;
            }

            CatalogMatureContentPolicy.applyQuarantineIfMature(game);
            CatalogDiscoveryPolicy.applyQuarantineIfExcluded(game);
            CatalogNoisePolicy.applyQuarantineIfProtectedTitleSpinoff(game);
            CatalogNoisePolicy.applyQuarantineIfNoise(game);
            gameRepository.save(game);
            if (CatalogNoisePolicy.shouldSkipCatalogSurfacing(game)) {
                continue;
            }

            addSearchResult(game, results, seenSlugs);
        }
    }

    private void appendUniqueGames(
            List<Game> candidates,
            Set<Long> candidateIds,
            List<Game> batch
    ) {
        for (Game game : batch) {
            if (game.getId() == null) {
                candidates.add(game);
                continue;
            }

            if (candidateIds.add(game.getId())) {
                candidates.add(game);
            }
        }
    }

    private void appendTrackedCatalogMatches(
            String query,
            List<GameCatalogSearchResponse> results,
            Set<String> seenSlugs
    ) {
        for (var entry : TrackedGameCatalog.allEntries().entrySet()) {
            String slug = entry.getKey();
            TrackedGameCatalog.GameAssetMetadata metadata = entry.getValue();

            if (!SearchQuerySupport.matchesCatalogQuery(query, metadata.gameName(), slug)) {
                continue;
            }

            if (!seenSlugs.add(canonicalSearchSlug(slug))) {
                continue;
            }

            try {
                Game game = gameRepository.findBySlug(slug)
                        .orElseGet(() -> gameRepository.save(buildTrackedCatalogGame(slug, metadata)));
                results.add(toSearchResponse(game));
            } catch (RuntimeException exception) {
                log.warn("Failed to resolve tracked catalog match '{}' during search", slug, exception);
            }
        }
    }

    @Transactional
    public void seedTrackedCatalogIfMissing() {
        for (var entry : TrackedGameCatalog.allEntries().entrySet()) {
            String slug = entry.getKey();
            if (gameRepository.findBySlug(slug).isPresent()) {
                continue;
            }

            gameRepository.save(buildTrackedCatalogGame(slug, entry.getValue()));
        }
    }

    private Game buildTrackedCatalogGame(
            String slug,
            TrackedGameCatalog.GameAssetMetadata metadata
    ) {
        return Game.builder()
                .slug(slug)
                .gameName(metadata.gameName())
                .steamAppId(metadata.appId())
                .featured(metadata.featured())
                .manualLock(ManualProtectedCatalogPolicy.SLUGS.contains(slug))
                .lifecycleState(LifecycleState.CATALOG)
                .build();
    }

    private Game upsertFromIgdbDiscovery(IgdbGameMatch match) {
        if (CatalogDiscoveryPolicy.isExcludedIgdbMatch(match)) {
            return null;
        }

        String slug = resolveDiscoverySlug(match);
        if (slug.isBlank()) {
            return null;
        }

        if (ManualProtectedCatalogPolicy.isProtectedTitleSpinoff(slug)) {
            gameRepository.findBySlug(slug).ifPresent(spinoff -> {
                CatalogNoisePolicy.applyQuarantineIfProtectedTitleSpinoff(spinoff);
                gameRepository.save(spinoff);
            });
            return null;
        }

        if (CatalogNoisePolicy.isTwitchCategoryNoise(slug, match.name())) {
            gameRepository.findBySlug(slug).ifPresent(CatalogNoisePolicy::applyQuarantineIfNoise);
            return null;
        }

        if (PinnedGamePolicy.isPinned(slug) && !PinnedGamePolicy.matchesIgdbGame(slug, match)) {
            return gameRepository.findBySlug(slug)
                    .map(this::reloadGameWithPlatforms)
                    .orElse(null);
        }

        if (ManualProtectedCatalogPolicy.SLUGS.contains(slug)) {
            return gameRepository.findBySlug(slug)
                    .map(this::reloadGameWithPlatforms)
                    .orElse(null);
        }

        Optional<Game> existing = resolveExistingGameForIgdbMatch(match, slug);
        if (existing.isPresent()) {
            Game game = existing.get();
            if (Boolean.TRUE.equals(game.getManualLock())) {
                return null;
            }

            if (game.getSteamAppId() != null
                    && match.steamAppId() != null
                    && !game.getSteamAppId().equals(match.steamAppId())) {
                slug = slug + "-" + match.steamAppId();
                existing = gameRepository.findBySlug(slug);
            }
        }

        final String resolvedSlug = slug;
        Game game = existing.orElseGet(() -> Game.builder()
                .slug(resolvedSlug)
                .gameName(match.name())
                .featured(false)
                .manualLock(false)
                .build());

        applyIgdbMatch(game, match);

        if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
            game.setLogoUrl(GameAssetPolicy.LOGO_NONE);
        }

        refreshSteamStoreMetadata(game);
        applyPinnedGameType(game);
        CatalogMatureContentPolicy.applyQuarantineIfMature(game);

        Game saved = gameRepository.saveAndFlush(game);
        if (CatalogNoisePolicy.shouldSkipCatalogSurfacing(saved)) {
            return null;
        }

        return reloadGameWithPlatforms(saved);
    }

    private Optional<Game> resolveExistingGameForIgdbMatch(IgdbGameMatch match) {
        return resolveExistingGameForIgdbMatch(match, resolveDiscoverySlug(match));
    }

    private Optional<Game> resolveExistingGameForIgdbMatch(IgdbGameMatch match, String slug) {
        if (match.igdbId() > 0) {
            Optional<Game> byIgdbId = gameRepository.findByIgdbGameId(match.igdbId());
            if (byIgdbId.isPresent()) {
                return byIgdbId;
            }
        }

        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }

        Optional<Game> bySlug = gameRepository.findBySlug(slug);
        if (bySlug.isPresent()) {
            return bySlug;
        }

        if (match.steamAppId() != null && match.steamAppId() > 0) {
            return gameRepository.findBySlug(slug + "-" + match.steamAppId());
        }

        return Optional.empty();
    }

    private String resolveDiscoverySlug(IgdbGameMatch match) {
        if (match.name() == null || match.name().isBlank()) {
            return "";
        }

        String slug = SlugUtils.toSlug(match.igdbSlug() != null && !match.igdbSlug().isBlank()
                ? match.igdbSlug()
                : match.name());
        if (slug.isBlank()) {
            return "";
        }

        return gameSlugMapper.getSteamSlug(slug);
    }

    @Transactional
    public int reconcileDuplicateCatalogSlugs() {
        int reconciled = 0;
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        for (Game game : List.copyOf(gameRepository.findAll())) {
            String slug = game.getSlug();
            String canonicalSlug = gameSlugMapper.getSteamSlug(slug);
            if (slug.equals(canonicalSlug)) {
                continue;
            }

            Long gameId = game.getId();
            if (gameId == null) {
                continue;
            }

            try {
                Integer updated = template.execute(status ->
                        reconcileDuplicateCatalogSlugInTransaction(gameId, slug, canonicalSlug));
                reconciled += updated == null ? 0 : updated;
            } catch (RuntimeException exception) {
                log.warn(
                        "Failed to reconcile duplicate catalog slug '{}' -> '{}'",
                        slug,
                        canonicalSlug,
                        exception
                );
            }
        }

        if (reconciled > 0) {
            log.info("Reconciled {} duplicate catalog slug(s)", reconciled);
        }

        return reconciled;
    }

    @Transactional
    public int reconcileProtectedTitleSpinoffs() {
        int quarantined = 0;

        for (Game game : List.copyOf(gameRepository.findAll())) {
            if (!ManualProtectedCatalogPolicy.isProtectedTitleSpinoff(game.getSlug())) {
                continue;
            }

            if (CatalogNoisePolicy.applyQuarantineIfProtectedTitleSpinoff(game)) {
                gameRepository.save(game);
                quarantined++;
            }
        }

        if (quarantined > 0) {
            log.info("Quarantined {} protected-title spinoff catalog row(s)", quarantined);
        }

        return quarantined;
    }

    @Transactional
    public int reconcileTwitchCategoryNoise() {
        int quarantined = 0;

        for (Game game : List.copyOf(gameRepository.findAll())) {
            if (!CatalogNoisePolicy.isTwitchCategoryNoise(game)) {
                continue;
            }

            if (CatalogNoisePolicy.applyQuarantineIfNoise(game)) {
                gameRepository.save(game);
                quarantined++;
            }
        }

        if (quarantined > 0) {
            log.info("Quarantined {} Twitch category noise row(s)", quarantined);
        }

        return quarantined;
    }

    @Transactional
    public int reconcileExcludedCatalogProfiles() {
        int quarantined = 0;

        for (Game game : List.copyOf(gameRepository.findAll())) {
            if (!CatalogDiscoveryPolicy.shouldSkipCatalogSurfacing(game)
                    && !CatalogMatureContentPolicy.isMatureGame(game)) {
                continue;
            }

            boolean changed = CatalogMatureContentPolicy.applyQuarantineIfMature(game)
                    || CatalogDiscoveryPolicy.applyQuarantineIfExcluded(game);
            if (changed) {
                gameRepository.save(game);
                quarantined++;
            }
        }

        if (quarantined > 0) {
            log.info("Quarantined {} excluded catalog profile row(s)", quarantined);
        }

        return quarantined;
    }

    private int reconcileDuplicateCatalogSlugInTransaction(
            Long gameId,
            String slug,
            String canonicalSlug
    ) {
        Game game = gameRepository.findById(gameId).orElse(null);
        if (game == null) {
            return 0;
        }

        return reconcileDuplicateCatalogSlug(game, slug, canonicalSlug);
    }

    private int reconcileDuplicateCatalogSlug(Game game, String slug, String canonicalSlug) {
        Optional<Game> canonicalGame = gameRepository.findBySlug(canonicalSlug);
        if (canonicalGame.isPresent()) {
            mergeDuplicateIntoCanonical(canonicalGame.get(), game);
            deleteDuplicateCatalogGame(canonicalGame.get(), game);
            return 1;
        }

        game.setSlug(canonicalSlug);
        try {
            gameRepository.saveAndFlush(game);
            indexabilityService.recalculateForSlug(canonicalSlug);
            return 1;
        } catch (DataIntegrityViolationException exception) {
            log.warn(
                    "Failed to rename duplicate catalog slug '{}' to '{}'; removing duplicate row",
                    slug,
                    canonicalSlug,
                    exception
            );
            gameRepository.findBySlug(canonicalSlug).ifPresent(canonical -> {
                mergeDuplicateIntoCanonical(canonical, game);
                deleteDuplicateCatalogGame(canonical, game);
            });
            return 1;
        }
    }

    private void mergeDuplicateIntoCanonical(Game canonical, Game duplicate) {
        boolean changed = false;

        if ((canonical.getTwitchGameId() == null || canonical.getTwitchGameId().isBlank())
                && duplicate.getTwitchGameId() != null
                && !duplicate.getTwitchGameId().isBlank()) {
            canonical.setTwitchGameId(duplicate.getTwitchGameId());
            changed = true;
        }

        if (canonical.getTwitchViewers() == null && duplicate.getTwitchViewers() != null) {
            canonical.setTwitchViewers(duplicate.getTwitchViewers());
            changed = true;
        }

        if (canonical.getTwitchRank() == null && duplicate.getTwitchRank() != null) {
            canonical.setTwitchRank(duplicate.getTwitchRank());
            changed = true;
        }

        if (canonical.getLivePlayers() == null && duplicate.getLivePlayers() != null) {
            canonical.setLivePlayers(duplicate.getLivePlayers());
            changed = true;
        }

        if ((canonical.getSteamAppId() == null || canonical.getSteamAppId() <= 0)
                && duplicate.getSteamAppId() != null
                && duplicate.getSteamAppId() > 0
                && SteamAppIdPolicy.mayAssignSteamAppId(canonical.getSlug(), duplicate.getSteamAppId())) {
            canonical.setSteamAppId(duplicate.getSteamAppId());
            changed = true;
        }

        if (changed) {
            gameRepository.save(canonical);
            indexabilityService.recalculateForSlug(canonical.getSlug());
        }
    }

    private void reassignDuplicateForeignKeys(Game canonical, Game duplicate) {
        Long canonicalId = canonical.getId();
        Long duplicateId = duplicate.getId();
        if (canonicalId == null || duplicateId == null || canonicalId.equals(duplicateId)) {
            return;
        }

        gamingNewsRepository.reassignGameIdToCanonical(
                canonicalId,
                canonical.getSlug(),
                duplicateId
        );
        gamingNewsRepository.reassignGameTagToCanonical(
                canonicalId,
                canonical.getSlug(),
                duplicate.getSlug(),
                duplicateId
        );

        gameTelemetryRepository.findByGame_Slug(duplicate.getSlug())
                .ifPresent(aliasTelemetry -> {
                    if (gameTelemetryRepository.findByGame_Slug(canonical.getSlug()).isPresent()) {
                        gameTelemetryRepository.delete(aliasTelemetry);
                        gameTelemetryRepository.flush();
                    } else {
                        aliasTelemetry.setGame(canonical);
                        gameTelemetryRepository.save(aliasTelemetry);
                        gameTelemetryRepository.flush();
                    }
                });

        gameTelemetryHistoryRepository.deleteByGame_Id(duplicateId);
        telemetryDailyRollupRepository.deleteByGame_Id(duplicateId);
    }

    private void deleteDuplicateCatalogGame(Game canonical, Game duplicate) {
        reassignDuplicateForeignKeys(canonical, duplicate);

        Long duplicateId = duplicate.getId();
        if (duplicateId != null) {
            gamingNewsRepository.detachGameId(duplicateId);
        }

        gameRepository.delete(duplicate);
        gameRepository.flush();
    }

    private String canonicalSearchSlug(String slug) {
        return gameSlugMapper.getSteamSlug(slug);
    }

    private boolean addSearchResult(
            Game game,
            List<GameCatalogSearchResponse> results,
            Set<String> seenCanonicalSlugs
    ) {
        if (CatalogNoisePolicy.shouldSkipCatalogSurfacing(game)) {
            return false;
        }

        String canonicalSlug = canonicalSearchSlug(game.getSlug());
        if (!seenCanonicalSlugs.add(canonicalSlug)) {
            return false;
        }

        Game searchableGame = reloadGameWithPlatforms(game);
        results.add(toSearchResponse(searchableGame, canonicalSlug));
        return true;
    }

    private Game reloadGameWithPlatforms(Game game) {
        if (game == null) {
            return null;
        }

        Optional<Game> reloaded = Optional.ofNullable(game.getSlug())
                .filter(slug -> !slug.isBlank())
                .flatMap(gameRepository::findBySlugWithPlatforms);

        if (reloaded.isEmpty()) {
            String canonicalSlug = canonicalSearchSlug(game.getSlug());
            if (canonicalSlug != null
                    && !canonicalSlug.isBlank()
                    && !canonicalSlug.equals(game.getSlug())) {
                reloaded = gameRepository.findBySlugWithPlatforms(canonicalSlug);
            }
        }

        if (reloaded.isEmpty() && game.getId() != null) {
            reloaded = gameRepository.findById(game.getId());
        }

        return reloaded.orElse(game);
    }

    private GameCatalogSearchResponse toSearchResponse(Game game) {
        return toSearchResponse(game, canonicalSearchSlug(game.getSlug()));
    }

    private GameCatalogSearchResponse toSearchResponse(Game game, String responseSlug) {
        String logoUrl = game.getLogoUrl();
        if (logoUrl == null || logoUrl.isBlank()) {
            logoUrl = GameAssetPolicy.LOGO_NONE;
        }

        return new GameCatalogSearchResponse(
                game.getId(),
                responseSlug,
                game.getGameName(),
                logoUrl.trim(),
                game.getCoverUrl(),
                game.getSteamAppId(),
                game.getUserRating(),
                game.getCriticRating(),
                game.getGenreName(),
                resolveGenreNames(game),
                game.getLivePlayers(),
                game.getTwitchViewers(),
                game.isUpcomingRelease(LocalDate.now()),
                game.resolveEarliestKnownReleaseDate()
                        .map(LocalDate::atStartOfDay)
                        .orElse(null)
        );
    }

    private List<String> resolveGenreNames(Game game) {
        if (game.getGenreNames() != null && !game.getGenreNames().isEmpty()) {
            return List.copyOf(game.getGenreNames());
        }

        if (game.getGenreName() != null && !game.getGenreName().isBlank()) {
            return List.of(game.getGenreName().trim());
        }

        return List.of();
    }

    @Transactional(noRollbackFor = DataIntegrityViolationException.class)
    public SyncGameCatalogResponse syncCatalog(SyncGameCatalogRequest request) {
        if (request.entries() == null || request.entries().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one catalog entry is required"
            );
        }

        int created = 0;
        int updated = 0;
        int skipped = 0;

        for (GameCatalogEntryPayload payload : request.entries()) {
            SyncCatalogEntryOutcome outcome = syncCatalogEntry(payload);
            if (outcome == SyncCatalogEntryOutcome.CREATED) {
                created++;
            } else if (outcome == SyncCatalogEntryOutcome.UPDATED) {
                updated++;
            } else {
                skipped++;
            }
        }

        return new SyncGameCatalogResponse(
                created,
                updated,
                skipped,
                request.entries().size()
        );
    }

    private SyncCatalogEntryOutcome syncCatalogEntry(GameCatalogEntryPayload payload) {
        if (payload.slug() == null || payload.slug().isBlank()) {
            return SyncCatalogEntryOutcome.SKIPPED;
        }

        String targetSlug = gameSlugMapper.getSteamSlug(payload.slug().trim());

        if (CatalogNoisePolicy.isTwitchCategoryNoise(targetSlug, payload.gameName())) {
            gameRepository.findBySlug(targetSlug).ifPresent(CatalogNoisePolicy::applyQuarantineIfNoise);
            return SyncCatalogEntryOutcome.SKIPPED;
        }

        if (ManualProtectedCatalogPolicy.SLUGS.contains(targetSlug)) {
            return updateTwitchMetricsOnly(payload, targetSlug)
                    ? SyncCatalogEntryOutcome.UPDATED
                    : SyncCatalogEntryOutcome.SKIPPED;
        }

        Optional<Game> existing = gameRepository.findBySlug(targetSlug);
        if (existing.isPresent() && Boolean.TRUE.equals(existing.get().getManualLock())) {
            return updateTwitchMetricsOnly(payload, targetSlug)
                    ? SyncCatalogEntryOutcome.UPDATED
                    : SyncCatalogEntryOutcome.SKIPPED;
        }

        Game game = existing.orElseGet(() -> Game.builder()
                .slug(targetSlug)
                .manualLock(false)
                .featured(false)
                .build());

        boolean isNew = game.getId() == null;
        applySyncCatalogFields(game, payload);

        return persistSyncedCatalogGame(game, targetSlug, isNew, payload);
    }

    private void applySyncCatalogFields(Game game, GameCatalogEntryPayload payload) {
        game.setGameName(resolveRequiredName(payload));
        resolveSteamAppIdForSync(game, payload);
        applyTwitchFields(game, payload);
        applyLiveMetricsFields(game, payload);

        if (!Boolean.TRUE.equals(game.getManualLock())) {
            applyGameAssets(game, payload);
            applySteamStoreFields(game, payload);
        }

        applyPinnedGameType(game);

        if (payload.featured() != null) {
            game.setFeatured(payload.featured());
        }
    }

    private SyncCatalogEntryOutcome persistSyncedCatalogGame(
            Game game,
            String targetSlug,
            boolean isNew,
            GameCatalogEntryPayload payload
    ) {
        try {
            gameRepository.save(game);
            gameRepository.flush();
            indexabilityService.recalculateForSlug(targetSlug);
            return isNew ? SyncCatalogEntryOutcome.CREATED : SyncCatalogEntryOutcome.UPDATED;
        } catch (DataIntegrityViolationException exception) {
            if (!isNew) {
                throw exception;
            }

            log.debug(
                    "Catalog sync slug collision for '{}'; reloading existing catalog row",
                    targetSlug
            );

            Game existing = gameRepository.findBySlug(targetSlug)
                    .orElseThrow(() -> exception);

            applySyncCatalogFields(existing, payload);
            gameRepository.save(existing);
            gameRepository.flush();
            indexabilityService.recalculateForSlug(targetSlug);
            return SyncCatalogEntryOutcome.UPDATED;
        }
    }

    private enum SyncCatalogEntryOutcome {
        SKIPPED,
        CREATED,
        UPDATED
    }

    @Transactional
    public void enrichMissingLogos() {
        enforceAllPinnedGamePolicies();

        int steamEnrichments = 0;
        int igdbEnrichments = 0;

        for (Game game : gameRepository.findAll()) {
            if (PinnedGamePolicy.isPinned(game.getSlug())) {
                continue;
            }

            if (CatalogNoisePolicy.applyQuarantineIfNoise(game)) {
                gameRepository.save(game);
                continue;
            }

            TrackedGameCatalog.findBySlug(game.getSlug())
                    .ifPresent(tracked -> game.setGameName(tracked.gameName()));

            GameAssetPolicy.normalizeStoredAssets(game);

            if (!Boolean.TRUE.equals(game.getManualLock())) {
                if (game.getSteamAppId() == null
                        && igdbEnrichments < STARTUP_IGDB_ENRICH_LIMIT
                        && !igdbSearchClient.isRateLimited()) {
                    resolveAllSteamAppIds(game);
                    igdbEnrichments++;
                } else {
                    knownSteamAppRegistry.resolveAppId(game.getSlug()).ifPresent(game::setSteamAppId);
                }

                if (needsSteamStoreRefresh(game)
                        && steamEnrichments < STARTUP_STEAM_ENRICH_LIMIT
                        && !steamStoreAppDetailsClient.isRateLimited()) {
                    refreshSteamStoreMetadata(game);
                    steamEnrichments++;
                }
            }

            if (CatalogMatureContentPolicy.applyQuarantineIfMature(game)) {
                gameRepository.save(game);
                continue;
            }

            boolean needsIgdbEnrichment = igdbSearchClient.isConfigured()
                    && (GameAssetPolicy.needsIgdbAssets(game)
                    || (game.getIgdbFirstReleaseDate() == null && game.getPlatforms().isEmpty()));

            if (needsIgdbEnrichment
                    && igdbEnrichments < STARTUP_IGDB_ENRICH_LIMIT
                    && !igdbSearchClient.isRateLimited()) {
                enrichFromIgdbSearch(game);
                igdbEnrichments++;
            }

            if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
                game.setLogoUrl(GameAssetPolicy.LOGO_NONE);
            }

            gameRepository.save(game);

            if (steamStoreAppDetailsClient.isRateLimited()
                    && igdbSearchClient.isRateLimited()
                    && steamEnrichments >= STARTUP_STEAM_ENRICH_LIMIT
                    && igdbEnrichments >= STARTUP_IGDB_ENRICH_LIMIT) {
                break;
            }
        }

        log.info(
                "Catalog startup enrichment finished (steam_calls={}, igdb_calls={}, steam_rate_limited={}, igdb_rate_limited={})",
                steamEnrichments,
                igdbEnrichments,
                steamStoreAppDetailsClient.isRateLimited(),
                igdbSearchClient.isRateLimited()
        );
    }

    private boolean needsSteamStoreRefresh(Game game) {
        Integer appId = game.getSteamAppId();
        if (appId == null || appId <= 0) {
            return false;
        }

        return !hasSteamStoreListing(game) || game.getSteamAdultContent() == null;
    }

    private boolean applyMissingAssetsFromPayload(
            Game game,
            GameCatalogEntryPayload payload
    ) {
        String previousLogo = game.getLogoUrl();
        String previousCover = game.getCoverUrl();
        applyGameAssets(game, payload);
        return !java.util.Objects.equals(previousLogo, game.getLogoUrl())
                || !java.util.Objects.equals(previousCover, game.getCoverUrl());
    }

    private void applyGameAssets(Game game, GameCatalogEntryPayload payload) {
        if (payload != null) {
            GameAssetPolicy.applyIgdbAssets(game, payload.logoUrl(), payload.coverUrl());
            IgdbMetadataSupport.applyToGame(
                    game,
                    payload.igdbGameId(),
                    payload.userRating(),
                    payload.criticRating(),
                    payload.screenshotUrls(),
                    payload.trailerVideoIds()
            );
            IgdbMetadataSupport.applyYoutubeChannelUrl(game, payload.youtubeChannelUrl());
            IgdbMetadataSupport.applyExternalLinks(game, payload.externalLinks());
            IgdbMetadataSupport.applyGenreNames(game, payload.genreNames());
            if (payload.genreNames() == null || payload.genreNames().isEmpty()) {
                IgdbMetadataSupport.applyGenreName(game, payload.genreName());
            }
            if (payload.igdbFirstReleaseDate() != null) {
                game.setIgdbFirstReleaseDate(payload.igdbFirstReleaseDate());
            }
        }

        GameAssetPolicy.normalizeStoredAssets(game);

        if (GameAssetPolicy.needsIgdbAssets(game)) {
            enrichFromIgdbSearch(game);
        }

        if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
            game.setLogoUrl(GameAssetPolicy.LOGO_NONE);
        }
    }

    @Transactional
    public void refreshSteamStoreMetadataOnVisit(String slug) {
        if (slug == null || slug.isBlank()) {
            return;
        }

        if (steamStoreAppDetailsClient.isRateLimited()) {
            return;
        }

        gameRepository.findBySlug(slug).ifPresent(game -> {
            Integer appId = game.getSteamAppId();
            if (appId == null || appId <= 0) {
                return;
            }

            boolean incomplete = needsSteamStoreRefresh(game);
            if (!incomplete && !steamMetadataRefreshPolicy.shouldRefreshOnVisit(slug)) {
                return;
            }

            refreshSteamStoreMetadata(game);
            applyPinnedGameType(game);
            gameRepository.save(game);
            steamMetadataRefreshPolicy.markRefreshed(slug);
        });
    }

    @Transactional
    public void enrichCatalogProfileOnDemand(String slug) {
        if (slug == null || slug.isBlank()) {
            return;
        }

        gameRepository.findBySlug(slug).ifPresent(game -> {
            if (PinnedGamePolicy.isPinned(game.getSlug())) {
                return;
            }

            if (game.getSteamAppId() == null) {
                resolveAllSteamAppIds(game);
            }

            boolean needsEnrichment = game.getSteamAppId() == null
                    || game.getIgdbGameId() == null
                    || GameAssetPolicy.needsIgdbAssets(game)
                    || game.getScreenshotUrls() == null
                    || game.getScreenshotUrls().isEmpty();

            if (!needsEnrichment) {
                return;
            }

            enrichFromIgdbSearch(game);
            gameRepository.save(game);
        });
    }

    private void enrichFromIgdbSearch(Game game) {
        if (!igdbSearchClient.isConfigured()) {
            return;
        }

        if (CatalogNoisePolicy.shouldSkipCatalogSurfacing(game)) {
            return;
        }

        String slug = game.getSlug();
        if (PinnedGamePolicy.isPinned(slug)) {
            enforcePinnedGameAssets(game);
            return;
        }

        if (tryApplyIgdbMatch(game, resolveIgdbMatch(game))) {
            return;
        }

        String gameName = game.getGameName();
        if (gameName == null || gameName.isBlank()) {
            return;
        }

        for (IgdbGameMatch match : igdbSearchClient.search(gameName, 24)) {
            if (!matchesIgdbGame(slug, match, game)) {
                continue;
            }

            applyIgdbMatch(game, match);
            return;
        }
    }

    private Optional<IgdbGameMatch> resolveIgdbMatch(Game game) {
        Long igdbGameId = game.getIgdbGameId();
        if (igdbGameId != null && igdbGameId > 0) {
            Optional<IgdbGameMatch> byId = igdbSearchClient.lookupById(igdbGameId);
            if (byId.isPresent()) {
                return byId;
            }
        }

        Integer steamAppId = game.getSteamAppId();
        if (steamAppId != null && steamAppId > 0) {
            Optional<IgdbGameMatch> bySteamAppId = igdbSearchClient.lookupBySteamAppId(steamAppId);
            if (bySteamAppId.isPresent()) {
                return bySteamAppId;
            }
        }

        String slug = game.getSlug();
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }

        Optional<IgdbGameMatch> bySlug = igdbSearchClient.lookupBySlug(slug);
        if (bySlug.isPresent() && matchesIgdbGame(slug, bySlug.get(), game)) {
            return bySlug;
        }

        return SlugUtils.toIgdbPossessiveSlugVariant(slug)
                .flatMap(igdbSearchClient::lookupBySlug)
                .filter(match -> matchesIgdbGame(slug, match, game));
    }

    private boolean tryApplyIgdbMatch(Game game, Optional<IgdbGameMatch> match) {
        if (match.isEmpty()) {
            return false;
        }

        applyIgdbMatch(game, match.get());
        return true;
    }

    private void applyIgdbMatch(Game game, IgdbGameMatch match) {
        if (match.name() != null && !match.name().isBlank()) {
            TrackedGameCatalog.findBySlug(game.getSlug())
                    .ifPresentOrElse(
                            tracked -> game.setGameName(tracked.gameName()),
                            () -> game.setGameName(match.name())
                    );
        }

        GameAssetPolicy.applyIgdbAssets(game, match.logoUrl(), match.coverUrl());
        IgdbMetadataSupport.applyToGame(
                game,
                match.igdbId(),
                match.userRating(),
                match.criticRating(),
                match.screenshotUrls(),
                match.trailerVideoIds()
        );
        IgdbMetadataSupport.applyYoutubeChannelUrl(game, match.youtubeChannelUrl());
        IgdbMetadataSupport.applyExternalLinks(game, match.externalLinks());
        IgdbMetadataSupport.applyGenreNames(game, match.genreNames());

        if (match.firstReleaseDate() != null) {
            game.setIgdbFirstReleaseDate(match.firstReleaseDate());
        }

        if (game.getSteamAppId() == null && match.steamAppId() != null
                && SteamAppIdPolicy.mayAssignSteamAppId(game.getSlug(), match.steamAppId())) {
            game.setSteamAppId(match.steamAppId());
        }

        PinnedGamePolicy.findBySlug(game.getSlug())
                .ifPresent(pin -> game.setSteamAppId(pin.steamAppId()));

        SteamAppIdPolicy.sanitize(game);
    }

    private boolean enforcePinnedGameAssets(Game game) {
        if (!PinnedGamePolicy.isPinned(game.getSlug())) {
            return false;
        }

        boolean changed = false;
        PinnedGamePolicy.Pin pin = PinnedGamePolicy.findBySlug(game.getSlug()).orElseThrow();

        if (!Integer.valueOf(pin.steamAppId()).equals(game.getSteamAppId())) {
            game.setSteamAppId(pin.steamAppId());
            changed = clearSteamQuarantine(game) || changed;
        } else if (Boolean.TRUE.equals(game.getSteamBlacklisted())) {
            changed = clearSteamQuarantine(game) || changed;
        }

        String trackedName = TrackedGameCatalog.resolveGameName(pin.slug());
        if (!trackedName.equals(game.getGameName())) {
            game.setGameName(trackedName);
            changed = true;
        }

        if (!changed && !PinnedGamePolicy.needsAssetRefresh(game)) {
            return false;
        }

        if (igdbSearchClient.isConfigured()) {
            Optional<IgdbGameMatch> match = igdbSearchClient.lookupBySlug(pin.igdbSlug())
                    .filter(candidate -> PinnedGamePolicy.matchesIgdbGame(game.getSlug(), candidate));
            if (match.isPresent()) {
                applyIgdbMatch(game, match.get());
                return true;
            }
        }

        PinnedGamePolicy.applyFallbackAssets(game);
        return true;
    }

    @Transactional
    public void enforceAllPinnedGamePolicies() {
        consolidateLegacySlugCollisions();

        for (Game game : gameRepository.findAll()) {
            if (!PinnedGamePolicy.isPinned(game.getSlug())) {
                continue;
            }

            if (enforcePinnedGameAssets(game)) {
                gameRepository.save(game);
            }
        }
    }

    @Transactional
    public int reconcileSteamAdultContentFlags() {
        int cleared = 0;

        for (Game game : gameRepository.findBySteamAdultContentTrueAndSteamAppIdIsNotNull()) {
            if (CatalogMatureContentPolicy.applyQuarantineIfMature(game)) {
                cleared++;
                gameRepository.save(game);
            }
        }

        if (cleared > 0) {
            log.info("Re-evaluated steamAdultContent quarantine for {} games without Steam refresh", cleared);
        }

        return cleared;
    }

    @Transactional
    public int reconcileSteamAppIds() {
        int cleared = 0;

        for (Game game : gameRepository.findAll()) {
            Integer before = game.getSteamAppId();
            Long playersBefore = game.getLivePlayers();
            SteamAppIdPolicy.sanitize(game);
            if (!java.util.Objects.equals(before, game.getSteamAppId())
                    || !java.util.Objects.equals(playersBefore, game.getLivePlayers())) {
                cleared++;
                gameRepository.save(game);
            }
        }

        if (cleared > 0) {
            log.info("Cleared invalid Steam app ids for {} games", cleared);
        }

        return cleared;
    }

    @Transactional
    public int reconcileGameTypes() {
        int updated = 0;

        for (Game game : gameRepository.findBySteamAppIdIsNotNull()) {
            GameType before = game.getGameType();
            applyPinnedGameType(game);
            if (before != game.getGameType()) {
                updated++;
                gameRepository.save(game);
            }
        }

        for (Game game : gameRepository.findBySteamAppIdIsNull()) {
            GameType before = game.getGameType();
            applyPinnedGameType(game);
            if (before != game.getGameType()) {
                updated++;
                gameRepository.save(game);
            }
        }

        if (updated > 0) {
            log.info("Reconciled game type for {} games", updated);
        }

        return updated;
    }

    private void consolidateLegacySlugCollisions() {
        gameRepository.findBySlug("counter-strike").ifPresent(legacy -> {
            if (gameRepository.findBySlug("counter-strike-2").isPresent()) {
                gameRepository.delete(legacy);
            }
        });
    }

    private boolean matchesIgdbGame(String slug, IgdbGameMatch match) {
        return matchesIgdbGame(slug, match, null);
    }

    private boolean matchesIgdbGame(String slug, IgdbGameMatch match, Game game) {
        if (PinnedGamePolicy.isPinned(slug)) {
            return PinnedGamePolicy.matchesIgdbGame(slug, match);
        }

        if (game != null) {
            Long igdbGameId = game.getIgdbGameId();
            if (igdbGameId != null && igdbGameId > 0 && igdbGameId == match.igdbId()) {
                return true;
            }

            Integer steamAppId = game.getSteamAppId();
            if (steamAppId != null
                    && steamAppId > 0
                    && match.steamAppId() != null
                    && steamAppId.equals(match.steamAppId())) {
                return true;
            }
        }

        String candidateSlug = SlugUtils.toSlug(match.name());
        if (slug.equals(candidateSlug)) {
            return true;
        }

        String igdbSlug = match.igdbSlug();
        if (igdbSlug != null && !igdbSlug.isBlank()) {
            if (slug.equals(igdbSlug.trim())) {
                return true;
            }

            return SlugUtils.toIgdbPossessiveSlugVariant(slug)
                    .map(variant -> variant.equals(igdbSlug.trim()))
                    .orElse(false);
        }

        return false;
    }

    private void resolveAllSteamAppIds(Game game) {
        knownSteamAppRegistry.resolveAppId(game.getSlug()).ifPresent(game::setSteamAppId);
        if (game.getSteamAppId() != null) {
            return;
        }

        resolveSteamAppIdFromLinkedSlug(game);
        if (game.getSteamAppId() != null) {
            return;
        }

        if (game.getGameName() == null || game.getGameName().isBlank()) {
            return;
        }

        String slug = game.getSlug();
        if (!igdbSearchClient.isConfigured()) {
            return;
        }

        for (IgdbGameMatch match : igdbSearchClient.search(game.getGameName(), 8)) {
            if (matchesIgdbGame(slug, match, game)) {
                if (SteamAppIdPolicy.mayAssignSteamAppId(slug, match.steamAppId())) {
                    game.setSteamAppId(match.steamAppId());
                }
                return;
            }
        }

        SteamAppIdPolicy.sanitize(game);
    }

    private void resolveSteamAppIdForSync(Game game, GameCatalogEntryPayload payload) {
        if (payload.steamAppId() != null) {
            if (SteamAppIdPolicy.mayAssignSteamAppId(game.getSlug(), payload.steamAppId())) {
                game.setSteamAppId(payload.steamAppId());
            }
            PinnedGamePolicy.findBySlug(game.getSlug())
                    .ifPresent(pin -> game.setSteamAppId(pin.steamAppId()));
            return;
        }

        if (game.getSteamAppId() != null) {
            return;
        }

        knownSteamAppRegistry.resolveAppId(game.getSlug()).ifPresent(game::setSteamAppId);
        if (game.getSteamAppId() != null) {
            return;
        }

        resolveSteamAppIdFromLinkedSlug(game);
        SteamAppIdPolicy.sanitize(game);
    }

    private void resolveSteamAppIdFromLinkedSlug(Game game) {
        String steamSlug = gameSlugMapper.getSteamSlug(game.getSlug());
        if (steamSlug.equals(game.getSlug())) {
            return;
        }

        gameRepository.findBySlug(steamSlug)
                .map(Game::getSteamAppId)
                .ifPresent(game::setSteamAppId);
    }

    private boolean updateTwitchMetricsOnly(GameCatalogEntryPayload payload, String targetSlug) {
        Optional<Game> existing = gameRepository.findBySlug(targetSlug);
        if (existing.isEmpty()) {
            return false;
        }

        Game game = existing.get();
        boolean changed = applyTwitchFields(game, payload);
        changed = applyLiveMetricsFields(game, payload) || changed;

        if (PinnedGamePolicy.isPinned(targetSlug)) {
            changed = enforcePinnedGameAssets(game) || changed;
        } else if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())
                || GameAssetPolicy.isVerticalCoverAsset(game.getLogoUrl())) {
            changed = applyMissingAssetsFromPayload(game, payload) || changed;
            if (GameAssetPolicy.needsIgdbAssets(game)) {
                enrichFromIgdbSearch(game);
                changed = true;
            }
        } else if (GameAssetPolicy.needsIgdbAssets(game)) {
            enrichFromIgdbSearch(game);
            changed = true;
        }

        if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
            game.setLogoUrl(GameAssetPolicy.LOGO_NONE);
        }
        if (!changed) {
            return false;
        }

        gameRepository.save(game);
        indexabilityService.recalculateForSlug(targetSlug);
        return true;
    }

    private boolean clearSteamQuarantine(Game game) {
        boolean changed = false;

        if (!Integer.valueOf(0).equals(game.getSteamConsecutive404Count())) {
            game.setSteamConsecutive404Count(0);
            changed = true;
        }

        if (Boolean.TRUE.equals(game.getSteamBlacklisted())) {
            game.setSteamBlacklisted(false);
            changed = true;
        }

        if (game.getSteamBlacklistRescanAt() != null) {
            game.setSteamBlacklistRescanAt(null);
            changed = true;
        }

        return changed;
    }

    private boolean applyLiveMetricsFields(Game game, GameCatalogEntryPayload payload) {
        boolean changed = false;

        if (payload.livePlayers() != null && !SteamAppIdPolicy.suppressesSteamPlayerTracking(game.getSlug())) {
            game.setLivePlayers(payload.livePlayers());
            changed = true;
        }

        if (payload.twitchViewers() != null) {
            game.setTwitchViewers(payload.twitchViewers());
            changed = true;
        }

        return changed;
    }

    private boolean applyTwitchFields(Game game, GameCatalogEntryPayload payload) {
        boolean changed = false;

        if (payload.twitchGameId() != null && !payload.twitchGameId().isBlank()) {
            game.setTwitchGameId(payload.twitchGameId().trim());
            changed = true;
        }

        if (payload.twitchRank() != null) {
            game.setTwitchRank(payload.twitchRank());
            changed = true;
        }

        return changed;
    }

    private String resolveRequiredName(GameCatalogEntryPayload payload) {
        if (payload.gameName() == null || payload.gameName().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "gameName is required for slug: " + payload.slug()
            );
        }

        String targetSlug = gameSlugMapper.getSteamSlug(payload.slug().trim());
        return TrackedGameCatalog.findBySlug(targetSlug)
                .map(TrackedGameCatalog.GameAssetMetadata::gameName)
                .orElseGet(() -> payload.gameName().trim());
    }

    private String formatSlugLabel(String slug) {
        if (slug == null || slug.isBlank()) {
            return "";
        }

        String[] words = slug.split("-");
        StringBuilder builder = new StringBuilder();
        for (String word : words) {
            if (word.isBlank()) {
                continue;
            }

            if (!builder.isEmpty()) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(word.charAt(0)));
            if (word.length() > 1) {
                builder.append(word.substring(1));
            }
        }
        return builder.isEmpty() ? slug : builder.toString();
    }
}
