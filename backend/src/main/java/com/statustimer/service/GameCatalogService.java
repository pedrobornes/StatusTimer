package com.statustimer.service;

import com.statustimer.config.GameAssetPolicy;
import com.statustimer.config.CacheConfig;
import com.statustimer.config.GameSlugMapper;
import com.statustimer.config.KnownSteamAppRegistry;
import com.statustimer.config.TrackedGameCatalog;
import com.statustimer.dto.request.GameCatalogEntryPayload;
import com.statustimer.dto.request.SyncGameCatalogRequest;
import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.dto.response.GameIndexableSlugResponse;
import com.statustimer.dto.response.SyncGameCatalogResponse;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TrackedGame;
import com.statustimer.integration.IgdbSearchClient;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import com.statustimer.repository.TrackedGameRepository;
import com.statustimer.util.IgdbMetadataSupport;
import com.statustimer.util.SlugUtils;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GameCatalogService {

    private static final int MAX_URL_LENGTH = 2048;
    private static final Set<String> MANUAL_PROTECTED_SLUGS = Set.of(
            "valorant",
            "fortnite"
    );
    private static final int IGDB_DISCOVERY_LIMIT = 8;

    private final TrackedGameRepository trackedGameRepository;
    private final IgdbSearchClient igdbSearchClient;
    private final GameSlugMapper gameSlugMapper;
    private final KnownSteamAppRegistry knownSteamAppRegistry;
    private final IndexabilityService indexabilityService;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.INDEXABLE_SLUGS_CACHE)
    public List<GameIndexableSlugResponse> findIndexableSlugs() {
        return trackedGameRepository.findByIsIndexableTrueOrderBySlugAsc().stream()
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
    public Optional<TrackedGame> findBySlug(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        return trackedGameRepository.findBySlug(canonicalSlug)
                .or(() -> Optional.ofNullable(toStaticTrackedGame(canonicalSlug)));
    }

    @Transactional(readOnly = true)
    public boolean isFeatured(String slug) {
        return findBySlug(slug)
                .map(TrackedGame::getFeatured)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public String resolveGameName(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        return findBySlug(slug)
                .map(TrackedGame::getGameName)
                .orElseGet(() -> TrackedGameCatalog.resolveGameName(canonicalSlug));
    }

    @Transactional(readOnly = true)
    public Integer resolveAppId(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        return findBySlug(slug)
                .map(TrackedGame::getSteamAppId)
                .or(() -> knownSteamAppRegistry.resolveAppId(canonicalSlug))
                .orElseGet(() -> TrackedGameCatalog.resolveAppId(canonicalSlug));
    }

    @Transactional(readOnly = true)
    public Integer resolveTwitchRank(String slug) {
        return findBySlug(slug)
                .map(TrackedGame::getTwitchRank)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public java.time.LocalDate resolveSteamReleaseDate(String slug) {
        return findBySlug(slug)
                .map(TrackedGame::getSteamReleaseDate)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public boolean isSteamAdultContent(String slug) {
        return findBySlug(slug)
                .map(TrackedGame::getSteamAdultContent)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public Long resolveLivePlayers(String slug) {
        return findBySlug(slug)
                .map(TrackedGame::getLivePlayers)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public Long resolveTwitchViewers(String slug) {
        return findBySlug(slug)
                .map(TrackedGame::getTwitchViewers)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String resolveTwitchGameId(String slug) {
        return findBySlug(slug)
                .map(TrackedGame::getTwitchGameId)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public String resolveLogoUrl(String slug, String fallbackLogoUrl) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        Optional<TrackedGame> tracked = findBySlug(slug);

        String persisted = tracked.map(TrackedGame::getLogoUrl).orElse(null);
        String resolved = GameAssetPolicy.resolveLogoUrl(canonicalSlug, persisted);
        if (GameAssetPolicy.isRenderableLogo(resolved)) {
            return resolved;
        }

        String fallback = GameAssetPolicy.sanitizeImageUrl(fallbackLogoUrl);
        if (fallback != null) {
            return fallback;
        }

        return GameAssetPolicy.LOGO_NONE;
    }

    @Transactional(readOnly = true)
    public String resolveCoverUrl(String slug, String fallbackCoverUrl) {
        Optional<TrackedGame> tracked = findBySlug(slug);
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

        int remaining = IGDB_DISCOVERY_LIMIT - results.size();
        if (remaining > 0 && igdbSearchClient.isConfigured()) {
            for (IgdbGameMatch match : igdbSearchClient.search(trimmed, remaining)) {
                TrackedGame discovered = upsertFromIgdbDiscovery(match);
                if (discovered == null) {
                    continue;
                }

                if (seenSlugs.add(discovered.getSlug())) {
                    results.add(toSearchResponse(discovered));
                }
            }
        }

        return results;
    }

    private void appendLocalMatches(
            String query,
            List<GameCatalogSearchResponse> results,
            Set<String> seenSlugs
    ) {
        for (TrackedGame game : trackedGameRepository
                .findByGameNameContainingIgnoreCaseOrSlugContainingIgnoreCase(query, query)) {
            if (seenSlugs.add(game.getSlug())) {
                results.add(toSearchResponse(game));
            }
        }

        String normalizedQuery = query.toLowerCase(Locale.ROOT);
        String slugQuery = SlugUtils.toSlug(query);

        for (var entry : TrackedGameCatalog.allEntries().entrySet()) {
            String slug = entry.getKey();
            if (seenSlugs.contains(slug)) {
                continue;
            }

            TrackedGameCatalog.GameAssetMetadata metadata = entry.getValue();
            boolean matchesName = metadata.gameName().toLowerCase(Locale.ROOT).contains(normalizedQuery);
            boolean matchesSlug = !slugQuery.isBlank() && slug.contains(slugQuery);

            if (!matchesName && !matchesSlug) {
                continue;
            }

            seenSlugs.add(slug);
            results.add(new GameCatalogSearchResponse(
                    slug,
                    metadata.gameName(),
                    GameAssetPolicy.resolveLogoUrl(slug, null),
                    null,
                    metadata.appId(),
                    null,
                    null,
                    null,
                    List.of()
            ));
        }
    }

    private TrackedGame upsertFromIgdbDiscovery(IgdbGameMatch match) {
        String slug = SlugUtils.toSlug(match.name());
        if (slug.isBlank() || MANUAL_PROTECTED_SLUGS.contains(slug)) {
            return null;
        }

        Optional<TrackedGame> existing = trackedGameRepository.findBySlug(slug);
        if (existing.isPresent()) {
            TrackedGame game = existing.get();
            if (Boolean.TRUE.equals(game.getManualLock())) {
                return null;
            }

            if (game.getSteamAppId() != null
                    && match.steamAppId() != null
                    && !game.getSteamAppId().equals(match.steamAppId())) {
                slug = slug + "-" + match.steamAppId();
                existing = trackedGameRepository.findBySlug(slug);
            }
        }

        final String resolvedSlug = slug;
        TrackedGame game = existing.orElseGet(() -> TrackedGame.builder()
                .slug(resolvedSlug)
                .gameName(match.name())
                .featured(false)
                .manualLock(false)
                .build());

        if (match.steamAppId() != null) {
            game.setSteamAppId(match.steamAppId());
        }

        GameAssetPolicy.applyIgdbAssets(game, match.logoUrl(), match.coverUrl());
        IgdbMetadataSupport.applyToTrackedGame(
                game,
                match.igdbId(),
                match.userRating(),
                match.criticRating(),
                match.themes(),
                List.of(),
                List.of()
        );
        IgdbMetadataSupport.applyGenreName(
                game,
                match.genreNames().isEmpty() ? null : match.genreNames().getFirst()
        );

        if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
            game.setLogoUrl(GameAssetPolicy.LOGO_NONE);
        }

        return trackedGameRepository.save(game);
    }

    private GameCatalogSearchResponse toSearchResponse(TrackedGame game) {
        String logoUrl = game.getLogoUrl();
        if (logoUrl == null || logoUrl.isBlank()) {
            logoUrl = GameAssetPolicy.LOGO_NONE;
        }

        return new GameCatalogSearchResponse(
                game.getSlug(),
                game.getGameName(),
                logoUrl.trim(),
                game.getCoverUrl(),
                game.getSteamAppId(),
                game.getUserRating(),
                game.getCriticRating(),
                game.getGenreName(),
                List.copyOf(game.getThemes())
        );
    }

    @Transactional
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
            if (payload.slug() == null || payload.slug().isBlank()) {
                skipped++;
                continue;
            }

            String targetSlug = gameSlugMapper.getSteamSlug(payload.slug().trim());

            if (MANUAL_PROTECTED_SLUGS.contains(targetSlug)) {
                if (updateTwitchMetricsOnly(payload, targetSlug)) {
                    updated++;
                } else {
                    skipped++;
                }
                continue;
            }

            Optional<TrackedGame> existing = trackedGameRepository.findBySlug(targetSlug);
            if (existing.isPresent() && Boolean.TRUE.equals(existing.get().getManualLock())) {
                if (updateTwitchMetricsOnly(payload, targetSlug)) {
                    updated++;
                } else {
                    skipped++;
                }
                continue;
            }

            TrackedGame game = existing.orElseGet(() -> TrackedGame.builder()
                    .slug(targetSlug)
                    .manualLock(false)
                    .featured(false)
                    .build());

            boolean isNew = game.getId() == null;

            game.setGameName(resolveRequiredName(payload));
            resolveSteamAppIdForSync(game, payload);
            applyTwitchFields(game, payload);
            applyLiveMetricsFields(game, payload);

            if (!Boolean.TRUE.equals(game.getManualLock())) {
                applyGameAssets(game, payload);
            }

            if (payload.featured() != null) {
                game.setFeatured(payload.featured());
            }

            trackedGameRepository.save(game);
            indexabilityService.recalculateForSlug(targetSlug);

            if (isNew) {
                created++;
            } else {
                updated++;
            }
        }

        return new SyncGameCatalogResponse(
                created,
                updated,
                skipped,
                request.entries().size()
        );
    }

    @Transactional
    public void enrichMissingLogos() {
        for (TrackedGame game : trackedGameRepository.findAll()) {
            GameAssetPolicy.normalizeStoredAssets(game);

            if (!Boolean.TRUE.equals(game.getManualLock())) {
                resolveAllSteamAppIds(game);
            }

            if (GameAssetPolicy.needsIgdbAssets(game)) {
                enrichFromIgdbSearch(game);
            }

            if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
                game.setLogoUrl(GameAssetPolicy.LOGO_NONE);
            }

            trackedGameRepository.save(game);
        }
    }

    private boolean applyMissingAssetsFromPayload(
            TrackedGame game,
            GameCatalogEntryPayload payload
    ) {
        String previousLogo = game.getLogoUrl();
        String previousCover = game.getCoverUrl();
        applyGameAssets(game, payload);
        return !java.util.Objects.equals(previousLogo, game.getLogoUrl())
                || !java.util.Objects.equals(previousCover, game.getCoverUrl());
    }

    private void applyGameAssets(TrackedGame game, GameCatalogEntryPayload payload) {
        if (payload != null) {
            GameAssetPolicy.applyIgdbAssets(game, payload.logoUrl(), payload.coverUrl());
            IgdbMetadataSupport.applyToTrackedGame(
                    game,
                    payload.igdbGameId(),
                    payload.userRating(),
                    payload.criticRating(),
                    payload.themes(),
                    payload.screenshotUrls(),
                    payload.trailerVideoIds()
            );
            IgdbMetadataSupport.applyGenreName(game, payload.genreName());
        }

        GameAssetPolicy.normalizeStoredAssets(game);

        if (GameAssetPolicy.needsIgdbAssets(game)) {
            enrichFromIgdbSearch(game);
        }

        if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
            game.setLogoUrl(GameAssetPolicy.LOGO_NONE);
        }
    }

    private void enrichFromIgdbSearch(TrackedGame game) {
        if (!igdbSearchClient.isConfigured()) {
            return;
        }

        String gameName = game.getGameName();
        if (gameName == null || gameName.isBlank()) {
            return;
        }

        String slug = game.getSlug();
        for (IgdbGameMatch match : igdbSearchClient.search(gameName, 8)) {
            if (!matchesIgdbGame(slug, match)) {
                continue;
            }

            GameAssetPolicy.applyIgdbAssets(game, match.logoUrl(), match.coverUrl());
            IgdbMetadataSupport.applyToTrackedGame(
                    game,
                    match.igdbId(),
                    match.userRating(),
                    match.criticRating(),
                    match.themes(),
                    List.of(),
                    List.of()
            );
            IgdbMetadataSupport.applyGenreName(
                    game,
                    match.genreNames().isEmpty() ? null : match.genreNames().getFirst()
            );

            if (game.getSteamAppId() == null && match.steamAppId() != null) {
                game.setSteamAppId(match.steamAppId());
            }

            return;
        }
    }

    private boolean matchesIgdbGame(String slug, IgdbGameMatch match) {
        String candidateSlug = SlugUtils.toSlug(match.name());
        if (slug.equals(candidateSlug)) {
            return true;
        }

        String igdbSlug = match.igdbSlug();
        if (igdbSlug != null && !igdbSlug.isBlank()) {
            return slug.equals(igdbSlug.trim());
        }

        return false;
    }

    private void resolveAllSteamAppIds(TrackedGame game) {
        knownSteamAppRegistry.resolveAppId(game.getSlug()).ifPresent(game::setSteamAppId);
        if (game.getSteamAppId() != null) {
            return;
        }

        Integer catalogAppId = TrackedGameCatalog.resolveAppId(game.getSlug());
        if (catalogAppId != null) {
            game.setSteamAppId(catalogAppId);
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

        for (IgdbGameMatch match : igdbSearchClient.search(game.getGameName(), 3)) {
            String candidateSlug = SlugUtils.toSlug(match.name());
            if (candidateSlug.equals(slug)) {
                if (match.steamAppId() != null) {
                    game.setSteamAppId(match.steamAppId());
                }
                return;
            }
        }
    }

    private void resolveSteamAppIdForSync(TrackedGame game, GameCatalogEntryPayload payload) {
        if (payload.steamAppId() != null) {
            game.setSteamAppId(payload.steamAppId());
            return;
        }

        if (game.getSteamAppId() != null) {
            return;
        }

        knownSteamAppRegistry.resolveAppId(game.getSlug()).ifPresent(game::setSteamAppId);
        if (game.getSteamAppId() != null) {
            return;
        }

        Integer catalogAppId = TrackedGameCatalog.resolveAppId(game.getSlug());
        if (catalogAppId != null) {
            game.setSteamAppId(catalogAppId);
            return;
        }

        resolveSteamAppIdFromLinkedSlug(game);
    }

    private void resolveSteamAppIdFromLinkedSlug(TrackedGame game) {
        String steamSlug = gameSlugMapper.getSteamSlug(game.getSlug());
        if (steamSlug.equals(game.getSlug())) {
            return;
        }

        trackedGameRepository.findBySlug(steamSlug)
                .map(TrackedGame::getSteamAppId)
                .ifPresent(game::setSteamAppId);
    }

    private boolean updateTwitchMetricsOnly(GameCatalogEntryPayload payload, String targetSlug) {
        Optional<TrackedGame> existing = trackedGameRepository.findBySlug(targetSlug);
        if (existing.isEmpty()) {
            return false;
        }

        TrackedGame game = existing.get();
        boolean changed = applyTwitchFields(game, payload);
        changed = applyLiveMetricsFields(game, payload) || changed;
        if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
            changed = applyMissingAssetsFromPayload(game, payload) || changed;
        }
        if (GameAssetPolicy.needsIgdbAssets(game)) {
            enrichFromIgdbSearch(game);
            changed = true;
        }
        if (!GameAssetPolicy.isRenderableLogo(game.getLogoUrl())) {
            game.setLogoUrl(GameAssetPolicy.LOGO_NONE);
        }
        if (!changed) {
            return false;
        }

        trackedGameRepository.save(game);
        indexabilityService.recalculateForSlug(targetSlug);
        return true;
    }

    private boolean applyLiveMetricsFields(TrackedGame game, GameCatalogEntryPayload payload) {
        boolean changed = false;

        if (payload.livePlayers() != null) {
            game.setLivePlayers(payload.livePlayers());
            changed = true;
        }

        if (payload.twitchViewers() != null) {
            game.setTwitchViewers(payload.twitchViewers());
            changed = true;
        }

        return changed;
    }

    private boolean applyTwitchFields(TrackedGame game, GameCatalogEntryPayload payload) {
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

        return payload.gameName().trim();
    }

    private TrackedGame toStaticTrackedGame(String slug) {
        return TrackedGameCatalog.findBySlug(slug)
                .map(metadata -> {
                    TrackedGame game = TrackedGame.builder()
                            .slug(slug)
                            .gameName(metadata.gameName())
                            .steamAppId(metadata.appId())
                            .featured(metadata.featured())
                            .manualLock(MANUAL_PROTECTED_SLUGS.contains(slug))
                            .build();

                    return game;
                })
                .orElse(null);
    }
}
