package com.statustimer.service;

import com.statustimer.config.HarvestScheduleProperties;
import com.statustimer.dto.request.CompleteHarvestWorkRequest;
import com.statustimer.dto.response.HarvestWorkTargetResponse;
import com.statustimer.dto.response.HarvestWorkloadResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.HarvestWorkType;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
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

    private static final Set<TelemetryStatus> DEGRADED_TELEMETRY = Set.of(
            TelemetryStatus.DOWN,
            TelemetryStatus.MAINTENANCE
    );

    private final GameRepository gameRepository;
    private final GameTelemetryRepository gameTelemetryRepository;
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
                if (!canApplyWorkResult(game, result.workType())) {
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

    /**
     * Page visit / user interest: accelerate harvest for actively monitored games,
     * or for visited Steam catalog titles (metrics + news only — not the whole Steam store).
     */
    @Transactional
    public void bumpScheduleAfterUserInterest(String slug) {
        gameRepository.findBySlug(slug).ifPresent(game -> {
            LocalDateTime now = LocalDateTime.now();
            if (isActiveMonitoring(game)) {
                game.setNextTelemetryAt(now);
                game.setNextMetricsAt(now);
                game.setNextNewsAt(now);
                gameRepository.save(game);
                return;
            }

            if (hasSteamAppId(game)) {
                game.setNextMetricsAt(now);
                game.setNextNewsAt(now);
                gameRepository.save(game);
            }
        });
    }

    @Transactional
    public void accelerateTelemetryForDegradedStatus(String slug) {
        gameRepository.findBySlug(slug).ifPresent(game -> {
            if (!isActiveMonitoring(game)) {
                return;
            }

            game.setNextTelemetryAt(LocalDateTime.now());
            gameRepository.save(game);
        });
    }

    private List<HarvestWorkTargetResponse> findTelemetryDue(LocalDateTime now) {
        int limit = harvestScheduleProperties.maxTelemetryPerCycle();
        List<Game> dueGames = gameRepository
                .findByLifecycleStateInAndNextTelemetryAtLessThanEqualOrderByScrapeTierAsc(
                        ACTIVE_MONITORING,
                        now,
                        PageRequest.of(0, limit)
                );

        Set<String> includedSlugs = new LinkedHashSet<>();
        List<HarvestWorkTargetResponse> targets = new ArrayList<>(dueGames.size());

        for (Game game : dueGames) {
            includedSlugs.add(game.getSlug());
            targets.add(toTargetResponse(game));
        }

        if (targets.size() < limit) {
            List<GameTelemetry> degraded = gameTelemetryRepository.findDegradedActiveMonitoring(
                    DEGRADED_TELEMETRY,
                    ACTIVE_MONITORING,
                    PageRequest.of(0, limit - targets.size())
            );

            for (GameTelemetry telemetry : degraded) {
                Game game = telemetry.getGame();
                if (game == null || game.getSlug() == null || game.getSlug().isBlank()) {
                    continue;
                }

                if (includedSlugs.add(game.getSlug())) {
                    targets.add(toTargetResponse(game));
                }
            }
        }

        return targets;
    }

    private List<HarvestWorkTargetResponse> findMetricsDue(LocalDateTime now) {
        int limit = harvestScheduleProperties.maxMetricsPerCycle();

        List<Game> monitoredGames = gameRepository
                .findByLifecycleStateInAndNextMetricsAtLessThanEqualOrderByScrapeTierAsc(
                        ACTIVE_MONITORING,
                        now,
                        PageRequest.of(0, limit)
                );

        List<HarvestWorkTargetResponse> targets = new ArrayList<>(monitoredGames.size());
        for (Game game : monitoredGames) {
            targets.add(toTargetResponse(game));
        }

        int catalogLimit = Math.min(
                limit - monitoredGames.size(),
                harvestScheduleProperties.maxCatalogMetricsPerCycle()
        );
        if (catalogLimit <= 0) {
            return targets;
        }

        for (Game game : gameRepository.findCatalogMetricsDue(
                LifecycleState.CATALOG,
                now,
                PageRequest.of(0, catalogLimit)
        )) {
            targets.add(toTargetResponse(game));
        }

        return targets;
    }

    private List<HarvestWorkTargetResponse> findNewsDue(LocalDateTime now) {
        int limit = harvestScheduleProperties.maxNewsPerCycle();

        List<Game> monitoredGames = gameRepository
                .findByLifecycleStateInAndNextNewsAtLessThanEqualOrderByScrapeTierAsc(
                        ACTIVE_MONITORING,
                        now,
                        PageRequest.of(0, limit)
                );

        List<HarvestWorkTargetResponse> targets = new ArrayList<>(monitoredGames.size());
        for (Game game : monitoredGames) {
            targets.add(toTargetResponse(game));
        }

        int catalogLimit = Math.min(
                limit - monitoredGames.size(),
                harvestScheduleProperties.maxCatalogNewsPerCycle()
        );
        if (catalogLimit <= 0) {
            return targets;
        }

        for (Game game : gameRepository.findCatalogSteamNewsDue(
                LifecycleState.CATALOG,
                now,
                PageRequest.of(0, catalogLimit)
        )) {
            targets.add(toTargetResponse(game));
        }

        return targets;
    }

    private void applyWorkResult(
            Game game,
            HarvestWorkType workType,
            boolean success,
            LocalDateTime now
    ) {
        int tier = java.util.Objects.requireNonNullElse(game.getScrapeTier(), 3);

        if (workType == HarvestWorkType.TELEMETRY) {
            int scheduleTier = resolveTelemetryScheduleTier(game);
            if (success) {
                game.setLastTelemetryAt(now);
                game.setNextTelemetryAt(
                        now.plusMinutes(harvestScheduleProperties.telemetryMinutesForTier(scheduleTier))
                );
            } else {
                game.setNextTelemetryAt(
                        now.plusMinutes(harvestScheduleProperties.failedRetryMinutes())
                );
            }
            return;
        }

        if (workType == HarvestWorkType.METRICS) {
            if (isCatalogMetricsCandidate(game)) {
                if (success) {
                    game.setNextMetricsAt(
                            now.plusMinutes(harvestScheduleProperties.catalogMetricsFreshnessMinutes())
                    );
                } else {
                    // Keep retrying after a visit — do not clear the schedule.
                    game.setNextMetricsAt(
                            now.plusMinutes(harvestScheduleProperties.failedRetryMinutes())
                    );
                }
                return;
            }

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

        if (isCatalogSteamNewsCandidate(game)) {
            if (success) {
                game.setLastNewsAt(now);
                game.setNextNewsAt(
                        now.plusMinutes(harvestScheduleProperties.catalogNewsFreshnessMinutes())
                );
            } else {
                game.setNextNewsAt(
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

    private int resolveTelemetryScheduleTier(Game game) {
        int configuredTier = java.util.Objects.requireNonNullElse(game.getScrapeTier(), 3);

        return gameTelemetryRepository.findByGame_Slug(game.getSlug())
                .map(GameTelemetry::getStatus)
                .filter(DEGRADED_TELEMETRY::contains)
                .map(status -> 1)
                .orElse(configuredTier);
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

    private boolean hasSteamAppId(Game game) {
        Integer steamAppId = game.getSteamAppId();
        if (steamAppId != null && steamAppId > 0) {
            return true;
        }

        Integer resolved = gameCatalogService.resolveAppId(game.getSlug());
        return resolved != null && resolved > 0;
    }

    private boolean isCatalogMetricsCandidate(Game game) {
        if (game == null || game.getLifecycleState() != LifecycleState.CATALOG) {
            return false;
        }

        if (hasSteamAppId(game)) {
            return true;
        }

        String twitchGameId = game.getTwitchGameId();
        return twitchGameId != null && !twitchGameId.isBlank();
    }

    private boolean isCatalogSteamNewsCandidate(Game game) {
        return game != null
                && game.getLifecycleState() == LifecycleState.CATALOG
                && hasSteamAppId(game);
    }

    private boolean canApplyWorkResult(Game game, HarvestWorkType workType) {
        if (isActiveMonitoring(game)) {
            return true;
        }

        if (workType == HarvestWorkType.METRICS && isCatalogMetricsCandidate(game)) {
            return true;
        }

        return workType == HarvestWorkType.NEWS && isCatalogSteamNewsCandidate(game);
    }
}
