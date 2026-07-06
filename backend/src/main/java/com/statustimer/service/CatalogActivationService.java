package com.statustimer.service;

import com.statustimer.config.GameSlugMapper;
import com.statustimer.config.TrackedGameCatalog;
import com.statustimer.dto.response.GameActivationResponse;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TrackedGame;
import com.statustimer.repository.TrackedGameRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CatalogActivationService {

    private final TrackedGameRepository trackedGameRepository;
    private final GameSlugMapper gameSlugMapper;
    private final ScrapeJobService scrapeJobService;
    private final HarvestScheduleService harvestScheduleService;

    @Transactional
    public GameActivationResponse activateOnDemand(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        TrackedGame game = trackedGameRepository.findBySlug(canonicalSlug)
                .orElseGet(() -> createPersistedGameIfKnown(canonicalSlug));

        if (game == null) {
            return new GameActivationResponse(canonicalSlug, false, false, false);
        }

        boolean promoted = promoteToMonitoredIfNeeded(game);
        boolean jobQueued = scrapeJobService.enqueueFullJob(canonicalSlug);

        trackedGameRepository.save(game);
        harvestScheduleService.ensureScheduleInitialized(game);

        return new GameActivationResponse(
                canonicalSlug,
                promoted,
                Boolean.TRUE.equals(game.getInitialTelemetryReady()),
                jobQueued
        );
    }

    @Transactional(readOnly = true)
    public boolean isTelemetryReady(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        return trackedGameRepository.findBySlug(canonicalSlug)
                .map(game -> Boolean.TRUE.equals(game.getInitialTelemetryReady()))
                .orElse(true);
    }

    @Transactional
    public void markTelemetryReady(String slug) {
        trackedGameRepository.findBySlug(slug).ifPresent(game -> {
            game.setInitialTelemetryReady(true);
            trackedGameRepository.save(game);
        });
    }

    private boolean promoteToMonitoredIfNeeded(TrackedGame game) {
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

    private void scheduleDueChecks(TrackedGame game) {
        LocalDateTime now = LocalDateTime.now();
        game.setNextTelemetryAt(now);
        game.setNextMetricsAt(now);

        if (game.getNextNewsAt() == null) {
            game.setNextNewsAt(now.plusHours(1));
        }
    }

    private TrackedGame createPersistedGameIfKnown(String slug) {
        return TrackedGameCatalog.findBySlug(slug)
                .map(metadata -> trackedGameRepository.save(TrackedGame.builder()
                        .slug(slug)
                        .gameName(metadata.gameName())
                        .steamAppId(metadata.appId())
                        .featured(metadata.featured())
                        .lifecycleState(LifecycleState.CATALOG)
                        .scrapeTier(metadata.featured() ? 1 : 2)
                        .build()))
                .orElse(null);
    }
}
