package com.statustimer.service;

import com.statustimer.config.CatalogMonitoringPolicy;
import com.statustimer.config.LifecycleMonitorProperties;
import com.statustimer.config.PinnedGamePolicy;
import com.statustimer.config.TrackedGameCatalog;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LifecycleMonitorService {

    private static final List<LifecycleState> ACTIVE_MONITORING = List.of(
            LifecycleState.MONITORED,
            LifecycleState.INDEXABLE
    );

    private final GameRepository gameRepository;
    private final LifecycleMonitorProperties lifecycleMonitorProperties;

    @Transactional
    public LifecycleMonitorReport runMonitorCycle() {
        int demoted = demoteInactiveMonitoredGames();
        int capDemoted = enforceMonitoredCap();
        int promoted = promoteEligibleCatalogGames();

        long active = gameRepository.countByLifecycleStateIn(ACTIVE_MONITORING);

        if (promoted > 0 || demoted > 0 || capDemoted > 0) {
            log.info(
                    "Lifecycle monitor: promoted={} demoted={} capDemoted={} active={} cap={}",
                    promoted,
                    demoted,
                    capDemoted,
                    active,
                    lifecycleMonitorProperties.maxMonitoredGames()
            );
        }

        return new LifecycleMonitorReport(promoted, demoted, capDemoted, active);
    }

    public boolean isProtectedFromDemotion(Game game) {
        if (game == null) {
            return true;
        }

        if (Boolean.TRUE.equals(game.getManualLock())) {
            return true;
        }

        if (game.getLifecycleState() == LifecycleState.INDEXABLE) {
            return true;
        }

        if (Boolean.TRUE.equals(game.getFeatured())) {
            return true;
        }

        if (TrackedGameCatalog.findBySlug(game.getSlug()).isPresent()) {
            return true;
        }

        return PinnedGamePolicy.isPinned(game.getSlug());
    }

    public boolean qualifiesForPromotion(Game game) {
        if (game == null || game.getLifecycleState() != LifecycleState.CATALOG) {
            return false;
        }

        if (CatalogMonitoringPolicy.isCatalogOnlyProfile(game)) {
            return false;
        }

        if (TrackedGameCatalog.findBySlug(game.getSlug()).isPresent()) {
            return true;
        }

        if (Boolean.TRUE.equals(game.getFeatured())) {
            return true;
        }

        int tier = java.util.Objects.requireNonNullElse(game.getScrapeTier(), 3);
        if (tier <= 2) {
            return true;
        }

        Integer twitchRank = game.getTwitchRank();
        return twitchRank != null && twitchRank <= 50;
    }

    private int demoteInactiveMonitoredGames() {
        LocalDateTime cutoff = LocalDateTime.now()
                .minusDays(lifecycleMonitorProperties.demoteInactivityDays());
        int demoted = 0;

        for (Game game : gameRepository.findByLifecycleState(LifecycleState.MONITORED)) {
            if (isProtectedFromDemotion(game)) {
                continue;
            }

            if (!isLowPriorityProfile(game)) {
                continue;
            }

            LocalDateTime lastSignal = game.getLastTelemetryAt();
            if (lastSignal != null && !lastSignal.isBefore(cutoff)) {
                continue;
            }

            demoteToCatalog(game);
            demoted++;
        }

        return demoted;
    }

    private int enforceMonitoredCap() {
        long active = gameRepository.countByLifecycleStateIn(ACTIVE_MONITORING);
        int max = lifecycleMonitorProperties.maxMonitoredGames();
        if (active <= max) {
            return 0;
        }

        int toDemote = (int) Math.min(active - max, Integer.MAX_VALUE);
        List<Game> monitored = new ArrayList<>(
                gameRepository.findByLifecycleState(LifecycleState.MONITORED)
        );

        monitored.sort(Comparator
                .comparingInt((Game game) -> java.util.Objects.requireNonNullElse(game.getScrapeTier(), 3))
                .reversed()
                .thenComparing(
                        game -> game.getTwitchRank() == null ? Integer.MAX_VALUE : game.getTwitchRank(),
                        Comparator.reverseOrder()
                )
                .thenComparing(
                        game -> game.getLastTelemetryAt() == null
                                ? LocalDateTime.MIN
                                : game.getLastTelemetryAt()
                )
        );

        int demoted = 0;
        for (Game game : monitored) {
            if (demoted >= toDemote) {
                break;
            }

            if (isProtectedFromDemotion(game)) {
                continue;
            }

            demoteToCatalog(game);
            demoted++;
        }

        return demoted;
    }

    private int promoteEligibleCatalogGames() {
        long active = gameRepository.countByLifecycleStateIn(ACTIVE_MONITORING);
        int max = lifecycleMonitorProperties.maxMonitoredGames();
        if (active >= max) {
            return 0;
        }

        int remainingSlots = (int) Math.min(
                max - active,
                lifecycleMonitorProperties.promoteMaxPerCycle()
        );

        int promoted = 0;
        for (Game game : gameRepository.findByLifecycleState(LifecycleState.CATALOG)) {
            if (promoted >= remainingSlots) {
                break;
            }

            if (!qualifiesForPromotion(game)) {
                continue;
            }

            promoteToMonitored(game);
            promoted++;
        }

        return promoted;
    }

    private boolean isLowPriorityProfile(Game game) {
        int tier = java.util.Objects.requireNonNullElse(game.getScrapeTier(), 3);
        if (tier <= 2) {
            return false;
        }

        Integer twitchRank = game.getTwitchRank();
        return twitchRank == null || twitchRank > 50;
    }

    private void promoteToMonitored(Game game) {
        LocalDateTime now = LocalDateTime.now();
        game.setLifecycleState(LifecycleState.MONITORED);
        game.setIsIndexable(false);

        if (game.getFirstMonitoredAt() == null) {
            game.setFirstMonitoredAt(now);
        }

        game.setNextTelemetryAt(now);
        game.setNextMetricsAt(now);
        if (game.getNextNewsAt() == null) {
            game.setNextNewsAt(now.plusHours(1));
        }

        gameRepository.save(game);
    }

    private void demoteToCatalog(Game game) {
        game.setLifecycleState(LifecycleState.CATALOG);
        game.setIsIndexable(false);
        game.setStaleReason(null);
        game.setNextTelemetryAt(null);
        game.setNextMetricsAt(null);
        gameRepository.save(game);
    }

    public record LifecycleMonitorReport(
            int promoted,
            int demoted,
            int capDemoted,
            long activeMonitored
    ) {
        public int totalDemoted() {
            return demoted + capDemoted;
        }
    }
}
