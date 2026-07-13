package com.statustimer.service;

import com.statustimer.config.HarvestScheduleProperties;
import com.statustimer.dto.request.CompleteHarvestWorkRequest;
import com.statustimer.dto.response.HarvestWorkTargetResponse;
import com.statustimer.dto.response.HarvestWorkloadResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.HarvestWorkType;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HarvestScheduleService {

    private static final Set<LifecycleState> ACTIVE_MONITORING = Set.of(
            LifecycleState.MONITORED,
            LifecycleState.INDEXABLE
    );

    private final GameRepository gameRepository;
    private final GameCatalogService gameCatalogService;
    private final HarvestScheduleProperties harvestScheduleProperties;

    @Transactional(readOnly = true)
    public HarvestWorkloadResponse getDueWorkload() {
        LocalDateTime now = LocalDateTime.now();

        return new HarvestWorkloadResponse(
                findTelemetryDue(now),
                findMetricsDue(now),
                findNewsDue(now)
        );
    }

    @Transactional
    public void recordTelemetrySuccess(String slug) {
        completeWork(new CompleteHarvestWorkRequest(List.of(
                new CompleteHarvestWorkRequest.HarvestWorkResultPayload(
                        slug,
                        HarvestWorkType.TELEMETRY,
                        true
                )
        )));
    }

    @Transactional
    public void completeWork(CompleteHarvestWorkRequest request) {
        if (request.results() == null || request.results().isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();

        for (CompleteHarvestWorkRequest.HarvestWorkResultPayload result : request.results()) {
            if (result.slug() == null || result.slug().isBlank() || result.workType() == null) {
                continue;
            }

            gameRepository.findBySlug(result.slug()).ifPresent(game -> {
                if (!isActiveMonitoring(game)) {
                    return;
                }

                applyWorkResult(game, result.workType(), result.success(), now);
                gameRepository.save(game);
            });
        }
    }

    @Transactional
    public void ensureScheduleInitialized(Game game) {
        if (!isActiveMonitoring(game)) {
            return;
        }

        initializeActiveMonitoringSchedule(game);
    }

    @Transactional
    public void initializeActiveMonitoringSchedule(Game game) {
        if (!isActiveMonitoring(game)) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        boolean changed = false;

        if (game.getNextTelemetryAt() == null) {
            game.setNextTelemetryAt(now);
            changed = true;
        }
        if (game.getNextMetricsAt() == null) {
            game.setNextMetricsAt(now);
            changed = true;
        }
        if (game.getNextNewsAt() == null) {
            game.setNextNewsAt(now.plusHours(1));
            changed = true;
        }

        if (changed) {
            gameRepository.save(game);
        }
    }

    @Transactional
    public void bumpScheduleAfterUserInterest(String slug) {
        gameRepository.findBySlug(slug).ifPresent(game -> {
            if (!isActiveMonitoring(game)) {
                return;
            }

            LocalDateTime now = LocalDateTime.now();
            game.setNextTelemetryAt(now);
            game.setNextMetricsAt(now);
            game.setNextNewsAt(now);
            gameRepository.save(game);
        });
    }

    private List<HarvestWorkTargetResponse> findTelemetryDue(LocalDateTime now) {
        return gameRepository
                .findByLifecycleStateInAndNextTelemetryAtLessThanEqualOrderByScrapeTierAsc(
                        ACTIVE_MONITORING,
                        now,
                        PageRequest.of(0, harvestScheduleProperties.maxTelemetryPerCycle())
                )
                .stream()
                .map(this::toTargetResponse)
                .toList();
    }

    private List<HarvestWorkTargetResponse> findMetricsDue(LocalDateTime now) {
        return gameRepository
                .findByLifecycleStateInAndNextMetricsAtLessThanEqualOrderByScrapeTierAsc(
                        ACTIVE_MONITORING,
                        now,
                        PageRequest.of(0, harvestScheduleProperties.maxMetricsPerCycle())
                )
                .stream()
                .map(this::toTargetResponse)
                .toList();
    }

    private List<HarvestWorkTargetResponse> findNewsDue(LocalDateTime now) {
        return gameRepository
                .findByLifecycleStateInAndNextNewsAtLessThanEqualOrderByScrapeTierAsc(
                        ACTIVE_MONITORING,
                        now,
                        PageRequest.of(0, harvestScheduleProperties.maxNewsPerCycle())
                )
                .stream()
                .map(this::toTargetResponse)
                .toList();
    }

    private void applyWorkResult(
            Game game,
            HarvestWorkType workType,
            boolean success,
            LocalDateTime now
    ) {
        int tier = java.util.Objects.requireNonNullElse(game.getScrapeTier(), 3);

        if (workType == HarvestWorkType.TELEMETRY) {
            if (success) {
                game.setLastTelemetryAt(now);
                game.setNextTelemetryAt(
                        now.plusMinutes(harvestScheduleProperties.telemetryMinutesForTier(tier))
                );
            } else {
                game.setNextTelemetryAt(
                        now.plusMinutes(harvestScheduleProperties.failedRetryMinutes())
                );
            }
            return;
        }

        if (workType == HarvestWorkType.METRICS) {
            if (success) {
                game.setNextMetricsAt(
                        now.plusMinutes(harvestScheduleProperties.metricsMinutesForTier(tier))
                );
            } else {
                game.setNextMetricsAt(
                        now.plusMinutes(harvestScheduleProperties.failedRetryMinutes())
                );
            }
            return;
        }

        if (success) {
            game.setLastNewsAt(now);
            game.setNextNewsAt(now.plusMinutes(harvestScheduleProperties.newsMinutesForTier(tier)));
        } else {
            game.setNextNewsAt(now.plusMinutes(harvestScheduleProperties.failedRetryMinutes()));
        }
    }

    private HarvestWorkTargetResponse toTargetResponse(Game game) {
        Map<String, String> externalLinks = game.getExternalLinks() != null
                ? Map.copyOf(game.getExternalLinks())
                : Map.of();

        return new HarvestWorkTargetResponse(
                game.getSlug(),
                game.getGameName(),
                gameCatalogService.resolveAppId(game.getSlug()),
                game.getTwitchGameId(),
                game.getScrapeTier(),
                externalLinks
        );
    }

    private boolean isActiveMonitoring(Game game) {
        return game.getLifecycleState() == LifecycleState.MONITORED
                || game.getLifecycleState() == LifecycleState.INDEXABLE;
    }
}
