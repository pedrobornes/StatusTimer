package com.statustimer.service;

import com.statustimer.config.CatalogMonitoringPolicy;
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

    private final GameRepository gameRepository;
    private final GameSlugMapper gameSlugMapper;
    private final ScrapeJobService scrapeJobService;
    private final HarvestScheduleService harvestScheduleService;
    private final GameCatalogService gameCatalogService;

    @Transactional
    public GameActivationResponse activateOnDemand(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        Game game = gameRepository.findBySlug(canonicalSlug)
                .orElseGet(this::createPersistedGameIfKnown);

        if (game == null) {
            return new GameActivationResponse(canonicalSlug, false, false, false, false);
        }

        gameCatalogService.enrichCatalogProfileOnDemand(canonicalSlug);
        game = gameRepository.findBySlug(canonicalSlug).orElse(game);

        boolean catalogOnly = CatalogMonitoringPolicy.isCatalogOnlyProfile(game);
        boolean promoted = promoteToMonitoredIfNeeded(game, catalogOnly);

        // Only enqueue an on-demand scrape job for games that have never produced
        // telemetry yet. Already-monitored games are refreshed by the scheduled
        // harvester, so visiting their page must not requeue a job every time.
        boolean needsInitialTelemetry = !Boolean.TRUE.equals(game.getInitialTelemetryReady());
        boolean jobQueued = !catalogOnly
                && needsInitialTelemetry
                && scrapeJobService.enqueueFullJob(canonicalSlug);

        if (catalogOnly) {
            game.setInitialTelemetryReady(true);
        } else if (jobQueued) {
            game.setInitialTelemetryReady(false);
        }

        gameRepository.save(game);
        harvestScheduleService.ensureScheduleInitialized(game);

        return new GameActivationResponse(
                canonicalSlug,
                promoted,
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

    private boolean promoteToMonitoredIfNeeded(Game game, boolean catalogOnly) {
        if (catalogOnly) {
            scheduleDueChecks(game);
            return false;
        }

        if (game.getLifecycleState() != LifecycleState.CATALOG) {
            scheduleDueChecks(game);
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        game.setLifecycleState(LifecycleState.MONITORED);
        game.setInitialTelemetryReady(false);
        game.setIsIndexable(false);

        if (game.getFirstMonitoredAt() == null) {
            game.setFirstMonitoredAt(now);
        }

        scheduleDueChecks(game);
        return true;
    }

    private void scheduleDueChecks(Game game) {
        LocalDateTime now = LocalDateTime.now();
        game.setNextTelemetryAt(now);
        game.setNextMetricsAt(now);

        if (game.getNextNewsAt() == null) {
            game.setNextNewsAt(now.plusHours(1));
        }
    }

    private Game createPersistedGameIfKnown() {
        return null;
    }
}
