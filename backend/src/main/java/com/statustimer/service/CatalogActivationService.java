package com.statustimer.service;

import com.statustimer.config.CatalogMonitoringPolicy;
import com.statustimer.config.CatalogMatureContentPolicy;
import com.statustimer.config.GameSlugMapper;
import com.statustimer.dto.response.GameActivationResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CatalogActivationService {

    private static final int STALE_TELEMETRY_REFRESH_HOURS = 24;

    private final GameRepository gameRepository;
    private final GameSlugMapper gameSlugMapper;
    private final ScrapeJobService scrapeJobService;
    private final HarvestScheduleService harvestScheduleService;
    private final GameCatalogService gameCatalogService;

    @Transactional
    public GameActivationResponse activateOnDemand(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        if (CatalogMatureContentPolicy.containsBannedWord(canonicalSlug)) {
            return new GameActivationResponse(canonicalSlug, false, false, false, false);
        }

        Game game = gameRepository.findBySlug(canonicalSlug)
                .or(() -> gameCatalogService.materializeCatalogGameOnDemand(canonicalSlug))
                .orElse(null);

        if (game == null) {
            return new GameActivationResponse(canonicalSlug, false, false, false, false);
        }

        gameCatalogService.enrichCatalogProfileOnDemand(canonicalSlug);
        gameCatalogService.refreshSteamStoreMetadataOnVisit(canonicalSlug);
        game = gameRepository.findBySlug(canonicalSlug).orElse(game);

        boolean catalogOnly = CatalogMonitoringPolicy.isCatalogOnlyProfile(game);
        boolean alreadyMonitored = isActiveMonitoring(game);

        boolean needsInitialTelemetry = !Boolean.TRUE.equals(game.getInitialTelemetryReady());
        boolean needsStaleRefresh = shouldRefreshStaleCatalogTelemetry(game, catalogOnly, alreadyMonitored);
        boolean jobQueued = false;

        if (!catalogOnly && (needsInitialTelemetry || needsStaleRefresh)) {
            jobQueued = scrapeJobService.enqueueFullJob(canonicalSlug);
        }

        if (catalogOnly) {
            game.setInitialTelemetryReady(true);
        } else if (jobQueued && needsInitialTelemetry) {
            game.setInitialTelemetryReady(false);
        }

        gameRepository.save(game);

        if (alreadyMonitored) {
            harvestScheduleService.bumpScheduleAfterUserInterest(canonicalSlug);
        }

        return new GameActivationResponse(
                canonicalSlug,
                false,
                Boolean.TRUE.equals(game.getInitialTelemetryReady()),
                jobQueued,
                catalogOnly
        );
    }

    @Transactional(readOnly = true)
    public boolean isTelemetryReady(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        return gameRepository.findBySlug(canonicalSlug)
                .map(game -> Boolean.TRUE.equals(game.getInitialTelemetryReady()))
                .orElse(true);
    }

    @Transactional
    public void markTelemetryReady(String slug) {
        gameRepository.findBySlug(slug).ifPresent(game -> {
            game.setInitialTelemetryReady(true);
            gameRepository.save(game);
        });
    }

    private boolean isActiveMonitoring(Game game) {
        return game.getLifecycleState() == LifecycleState.MONITORED
                || game.getLifecycleState() == LifecycleState.INDEXABLE;
    }

    private boolean shouldRefreshStaleCatalogTelemetry(
            Game game,
            boolean catalogOnly,
            boolean alreadyMonitored
    ) {
        if (catalogOnly || alreadyMonitored) {
            return false;
        }

        if (game.getLifecycleState() != LifecycleState.CATALOG) {
            return false;
        }

        if (!Boolean.TRUE.equals(game.getInitialTelemetryReady())) {
            return false;
        }

        LocalDateTime lastTelemetryAt = game.getLastTelemetryAt();
        if (lastTelemetryAt == null) {
            return false;
        }

        return lastTelemetryAt.isBefore(
                LocalDateTime.now().minusHours(STALE_TELEMETRY_REFRESH_HOURS)
        );
    }

}
