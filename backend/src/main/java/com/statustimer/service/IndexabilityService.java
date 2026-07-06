package com.statustimer.service;

import com.statustimer.config.CacheConfig;
import com.statustimer.config.IndexabilityProperties;
import com.statustimer.dto.response.IndexabilityStatusResponse;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.entity.TrackedGame;
import com.statustimer.repository.GameTelemetryRepository;
import com.statustimer.repository.TrackedGameRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class IndexabilityService {

    private final TrackedGameRepository trackedGameRepository;
    private final GameTelemetryRepository gameTelemetryRepository;
    private final IndexabilityProperties indexabilityProperties;

    @Transactional(readOnly = true)
    public boolean isIndexable(String slug) {
        return trackedGameRepository.findBySlug(slug)
                .map(game -> evaluateIndexability(game, gameTelemetryRepository.findByGameSlug(slug)))
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public IndexabilityStatusResponse describeIndexability(String slug) {
        return trackedGameRepository.findBySlug(slug)
                .map(game -> buildStatus(game, gameTelemetryRepository.findByGameSlug(slug)))
                .orElseGet(() -> new IndexabilityStatusResponse(
                        slug,
                        false,
                        false,
                        false,
                        false,
                        false,
                        false,
                        null
                ));
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.INDEXABLE_SLUGS_CACHE, allEntries = true)
    public void recalculateForSlug(String slug) {
        trackedGameRepository.findBySlug(slug).ifPresent(game -> {
            Optional<GameTelemetry> telemetry = gameTelemetryRepository.findByGameSlug(slug);
            applyIndexability(game, telemetry);
            trackedGameRepository.save(game);
        });
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.INDEXABLE_SLUGS_CACHE, allEntries = true)
    public void recalculateAll() {
        for (TrackedGame game : trackedGameRepository.findAll()) {
            Optional<GameTelemetry> telemetry = gameTelemetryRepository.findByGameSlug(game.getSlug());
            applyIndexability(game, telemetry);
            trackedGameRepository.save(game);
        }
    }

    public boolean evaluateIndexability(TrackedGame game, Optional<GameTelemetry> telemetry) {
        return buildStatus(game, telemetry).indexable();
    }

    private IndexabilityStatusResponse buildStatus(
            TrackedGame game,
            Optional<GameTelemetry> telemetry
    ) {
        if (game.getLifecycleState() == LifecycleState.CATALOG) {
            return negativeStatus(game, false, false, false, false, false, game.getStaleReason());
        }

        if (!Boolean.TRUE.equals(game.getInitialTelemetryReady())) {
            return negativeStatus(game, false, false, false, false, false, game.getStaleReason());
        }

        if (isBlockingStaleReason(game.getStaleReason())) {
            return negativeStatus(game, false, false, false, false, false, game.getStaleReason());
        }

        boolean telemetryFresh = isTelemetryFresh(game);
        boolean probeSignal = telemetry.map(this::telemetryHasProbeSignal).orElse(false);
        boolean liveMetrics = hasLiveMetrics(game);
        boolean monitoringAgeMet = isMonitoringAgeMet(game);
        boolean contentReady = isContentReady(game, monitoringAgeMet);

        boolean indexable = telemetryFresh
                && (probeSignal || liveMetrics)
                && monitoringAgeMet
                && contentReady
                && game.getLastTelemetryAt() != null;

        return new IndexabilityStatusResponse(
                game.getSlug(),
                indexable,
                telemetryFresh,
                probeSignal,
                liveMetrics,
                monitoringAgeMet,
                contentReady,
                game.getStaleReason()
        );
    }

    private IndexabilityStatusResponse negativeStatus(
            TrackedGame game,
            boolean telemetryFresh,
            boolean probeSignal,
            boolean liveMetrics,
            boolean monitoringAgeMet,
            boolean contentReady,
            String staleReason
    ) {
        return new IndexabilityStatusResponse(
                game.getSlug(),
                false,
                telemetryFresh,
                probeSignal,
                liveMetrics,
                monitoringAgeMet,
                contentReady,
                staleReason
        );
    }

    private boolean isTelemetryFresh(TrackedGame game) {
        if (game.getLastTelemetryAt() == null) {
            return false;
        }

        int tier = game.getScrapeTier() != null ? game.getScrapeTier() : 3;
        long hoursSinceTelemetry = ChronoUnit.HOURS.between(game.getLastTelemetryAt(), LocalDateTime.now());
        return hoursSinceTelemetry <= indexabilityProperties.freshnessHoursForTier(tier);
    }

    private boolean isMonitoringAgeMet(TrackedGame game) {
        if (game.getFirstMonitoredAt() == null) {
            return false;
        }

        long hoursMonitored = ChronoUnit.HOURS.between(game.getFirstMonitoredAt(), LocalDateTime.now());
        return hoursMonitored >= indexabilityProperties.monitoringAgeHours();
    }

    private boolean isContentReady(TrackedGame game, boolean monitoringAgeMet) {
        return monitoringAgeMet && Boolean.TRUE.equals(game.getInitialTelemetryReady());
    }

    private boolean isBlockingStaleReason(String staleReason) {
        if (staleReason == null || staleReason.isBlank()) {
            return false;
        }

        return !IndexabilityProperties.STALE_REASON_API_OUTAGE.equals(staleReason);
    }

    private void applyIndexability(TrackedGame game, Optional<GameTelemetry> telemetry) {
        boolean indexable = evaluateIndexability(game, telemetry);
        game.setIsIndexable(indexable);

        if (indexable) {
            game.setLifecycleState(LifecycleState.INDEXABLE);
            if (IndexabilityProperties.STALE_REASON_STALE_TELEMETRY.equals(game.getStaleReason())) {
                game.setStaleReason(null);
            }
            return;
        }

        if (game.getLifecycleState() == LifecycleState.INDEXABLE) {
            game.setLifecycleState(LifecycleState.MONITORED);
        }
    }

    private boolean hasLiveMetrics(TrackedGame game) {
        return (game.getLivePlayers() != null && game.getLivePlayers() > 0)
                || (game.getTwitchViewers() != null && game.getTwitchViewers() > 0);
    }

    private boolean telemetryHasProbeSignal(GameTelemetry telemetry) {
        if (telemetry.getStatus() == TelemetryStatus.UPCOMING) {
            return false;
        }

        if (telemetry.getDataSource() == TelemetrySource.NETWORK_PROBE) {
            return true;
        }

        if (telemetry.getDataSource() == TelemetrySource.STEAM_API) {
            return true;
        }

        return telemetry.getLatencyMs() != null
                && telemetry.getLatencyMs() > 0
                && telemetry.getDataSource() != TelemetrySource.STATUS_PAGE;
    }
}
