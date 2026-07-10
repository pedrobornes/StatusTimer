package com.statustimer.service;

import com.statustimer.config.CatalogMonitoringPolicy;
import com.statustimer.config.CatalogMatureContentPolicy;
import com.statustimer.config.GameSlugMapper;
import com.statustimer.dto.response.GameActivationResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
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
        if (CatalogMatureContentPolicy.containsBannedWord(canonicalSlug)) {
            return new GameActivationResponse(canonicalSlug, false, false, false, false);
        }

        Game game = gameRepository.findBySlug(canonicalSlug)
                .orElseGet(this::createPersistedGameIfKnown);

        if (game == null) {
            return new GameActivationResponse(canonicalSlug, false, false, false, false);
        }

        gameCatalogService.enrichCatalogProfileOnDemand(canonicalSlug);
        game = gameRepository.findBySlug(canonicalSlug).orElse(game);

        boolean catalogOnly = CatalogMonitoringPolicy.isCatalogOnlyProfile(game);
        boolean alreadyMonitored = isActiveMonitoring(game);

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

    private Game createPersistedGameIfKnown() {
        return null;
    }
}
