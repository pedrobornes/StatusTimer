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
import com.statustimer.integration.SteamStoreAppDetailsClient;
import com.statustimer.integration.SteamStoreSearchClient;
import com.statustimer.integration.SteamStoreSearchClient.SteamStoreSearchResult;
import com.statustimer.repository.TrackedGameRepository;
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
            "fortnite",
            "gta-vi"
    );
    private static final int STEAM_DISCOVERY_LIMIT = 8;

    private final TrackedGameRepository trackedGameRepository;
    private final SteamStoreSearchClient steamStoreSearchClient;
    private final GameSlugMapper gameSlugMapper;
    private final KnownSteamAppRegistry knownSteamAppRegistry;
    private final SteamStoreAppDetailsClient steamStoreAppDetailsClient;
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
    public String resolveLogoUrl(String slug, String fallbackLogoUrl) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        Optional<TrackedGame> tracked = findBySlug(slug);

        String persisted = tracked.map(TrackedGame::getLogoUrl).orElse(null);
        Integer steamAppId = tracked.map(TrackedGame::getSteamAppId)
                .or(() -> knownSteamAppRegistry.resolveAppId(canonicalSlug))
                .orElseGet(() -> TrackedGameCatalog.resolveAppId(canonicalSlug));

        String resolved = GameAssetPolicy.resolveLogoUrl(canonicalSlug, steamAppId, persisted);
        if (GameAssetPolicy.isRenderableLogo(resolved)) {
            return resolved;
        }

        if (fallbackLogoUrl != null
                && !fallbackLogoUrl.isBlank()
                && !GameAssetPolicy.LOGO_NONE.equalsIgnoreCase(fallbackLogoUrl.trim())) {
            return fallbackLogoUrl.trim();
        }

        return GameAssetPolicy.LOGO_NONE;
    }

    @Transactional(readOnly = true)
    public String resolveCoverUrl(String slug, String fallbackCoverUrl) {
        Optional<TrackedGame> tracked = findBySlug(slug);
        if (tracked.isPresent()) {
            String coverUrl = tracked.get().getCoverUrl();
            if (coverUrl != null && !coverUrl.isBlank()) {
                return coverUrl.trim();
            }
        }

        return fallbackCoverUrl != null && !fallbackCoverUrl.isBlank()
                ? fallbackCoverUrl.trim()
                : null;
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

        if (!results.isEmpty()) {
            return results;
        }

        for (SteamStoreSearchResult steamResult : steamStoreSearchClient.search(
                trimmed,
                STEAM_DISCOVERY_LIMIT
        )) {
            TrackedGame discovered = upsertFromSteamDiscovery(steamResult);
            if (discovered == null) {
                continue;
            }

            if (seenSlugs.add(discovered.getSlug())) {
                results.add(toSearchResponse(discovered));
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
                    GameAssetPolicy.resolveLogoUrl(slug, metadata.appId(), null),
                    metadata.appId()
            ));
        }
    }

    private TrackedGame upsertFromSteamDiscovery(SteamStoreSearchResult steamResult) {
        String slug = SlugUtils.toSlug(steamResult.name());
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
                    && game.getSteamAppId() != steamResult.appId()) {
                slug = slug + "-" + steamResult.appId();
                existing = trackedGameRepository.findBySlug(slug);
            }
        }

        final String resolvedSlug = slug;
        TrackedGame game = existing.orElseGet(() -> TrackedGame.builder()
                .slug(resolvedSlug)
                .gameName(steamResult.name())
                .featured(false)
                .manualLock(false)
                .build());

        game.setSteamAppId(steamResult.appId());
        applyGameAssets(game, null);

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
                game.getSteamAppId()
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
                applyGameAssets(game, payload.coverUrl());
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
            boolean manualLock = Boolean.TRUE.equals(game.getManualLock());

            if (!manualLock) {
                resolveAllSteamAppIds(game);
            }

            if (!manualLock || GameAssetPolicy.LOCAL_LOGO_SLUGS.contains(game.getSlug())) {
                applyGameAssets(game, resolveTwitchCoverFallback(game));
            }

            trackedGameRepository.save(game);
        }
    }

    private void applyGameAssets(TrackedGame game, String twitchCoverUrl) {
        if (game.getSteamAppId() != null) {
            steamStoreAppDetailsClient.fetchMetadata(game.getSteamAppId()).ifPresentOrElse(
                    metadata -> {
                        GameAssetPolicy.applySteamAssets(
                                game,
                                metadata.logoUrl(),
                                metadata.coverUrl(),
                                twitchCoverUrl
                        );

                        if (metadata.releaseDate() != null) {
                            game.setSteamReleaseDate(metadata.releaseDate());
                        }

                        if (metadata.adultContent()) {
                            game.setSteamAdultContent(true);
                        }
                    },
                    () -> GameAssetPolicy.applySteamAssets(
                            game,
                            GameAssetPolicy.steamLogoUrl(game.getSteamAppId()),
                            GameAssetPolicy.steamLibraryHeroUrl(game.getSteamAppId()),
                            twitchCoverUrl
                    )
            );
            return;
        }

        GameAssetPolicy.applyTo(game, twitchCoverUrl);
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
        for (SteamStoreSearchResult result : steamStoreSearchClient.search(game.getGameName(), 5)) {
            String candidateSlug = SlugUtils.toSlug(result.name());
            if (candidateSlug.equals(slug)) {
                game.setSteamAppId(result.appId());
                return;
            }
        }
    }

    private String resolveTwitchCoverFallback(TrackedGame game) {
        return game.getCoverUrl();
    }

    private String resolveCoverFallback(String twitchCoverUrl, String existingCoverUrl) {
        if (twitchCoverUrl != null && !twitchCoverUrl.isBlank()) {
            return twitchCoverUrl.trim();
        }

        if (existingCoverUrl != null && !existingCoverUrl.isBlank()) {
            return existingCoverUrl.trim();
        }

        return null;
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

                    if (metadata.appId() == null) {
                        GameAssetPolicy.applyTo(game, null);
                    }

                    return game;
                })
                .orElse(null);
    }
}
