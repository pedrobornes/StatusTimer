package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.config.IndexabilityProperties;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/**
 * Verifies the SEO indexability contract: CATALOG games are never indexable,
 * and only fully-qualified MONITORED games (fresh telemetry + live/probe signal
 * + monitoring age met) flip to indexable.
 */
class IndexabilityServiceTest {

    private final IndexabilityService service = new IndexabilityService(
            null,
            null,
            new IndexabilityProperties(48, 24, 48, 72, 900_000L, 1)
    );

    @Test
    void catalogGameIsNeverIndexable() {
        Game game = qualifiedGame();
        game.setLifecycleState(LifecycleState.CATALOG);

        assertThat(service.evaluateIndexability(game, Optional.of(probeTelemetry(game))))
                .isFalse();
    }

    @Test
    void monitoredGameMeetingEveryCriterionIsIndexable() {
        Game game = qualifiedGame();

        assertThat(service.evaluateIndexability(game, Optional.of(probeTelemetry(game))))
                .isTrue();
    }

    @Test
    void staleTelemetryIsNotIndexable() {
        Game game = qualifiedGame();
        game.setLastTelemetryAt(LocalDateTime.now().minusHours(100)); // tier 2 freshness = 48h

        assertThat(service.evaluateIndexability(game, Optional.of(probeTelemetry(game))))
                .isFalse();
    }

    @Test
    void freshGameStillMonitoringWarmupIsNotIndexable() {
        Game game = qualifiedGame();
        game.setFirstMonitoredAt(LocalDateTime.now().minusHours(2)); // < 48h monitoring age

        assertThat(service.evaluateIndexability(game, Optional.of(probeTelemetry(game))))
                .isFalse();
    }

    @Test
    void noProbeSignalAndNoLiveMetricsIsNotIndexable() {
        Game game = qualifiedGame();
        game.setLivePlayers(0L);
        game.setTwitchViewers(0L);

        GameTelemetry statusPageOnly = GameTelemetry.builder()
                .game(game)
                .status(TelemetryStatus.ONLINE)
                .latencyMs(0)
                .dataSource(TelemetrySource.STATUS_PAGE)
                .lastChecked(LocalDateTime.now())
                .build();

        assertThat(service.evaluateIndexability(game, Optional.of(statusPageOnly)))
                .isFalse();
    }

    private Game qualifiedGame() {
        return Game.builder()
                .slug("qualified-game")
                .gameName("Qualified Game")
                .lifecycleState(LifecycleState.MONITORED)
                .initialTelemetryReady(true)
                .scrapeTier(2)
                .firstMonitoredAt(LocalDateTime.now().minusHours(49))
                .lastTelemetryAt(LocalDateTime.now())
                .livePlayers(1_000L)
                .build();
    }

    private GameTelemetry probeTelemetry(Game game) {
        return GameTelemetry.builder()
                .game(game)
                .status(TelemetryStatus.ONLINE)
                .latencyMs(42)
                .dataSource(TelemetrySource.STEAM_API)
                .lastChecked(LocalDateTime.now())
                .build();
    }
}
