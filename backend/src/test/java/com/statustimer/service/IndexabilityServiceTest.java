package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.config.IndexabilityProperties;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class IndexabilityServiceTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameTelemetryRepository gameTelemetryRepository;

    private IndexabilityService indexabilityService;

    @BeforeEach
    void setUp() {
        IndexabilityProperties properties = new IndexabilityProperties(48, 24, 48, 72, 900_000L, 1);
        indexabilityService = new IndexabilityService(
                gameRepository,
                gameTelemetryRepository,
                properties
        );
    }

    @Test
    void rejectsCatalogGames() {
        Game game = monitoredGame("valorant");
        game.setLifecycleState(LifecycleState.CATALOG);

        assertThat(indexabilityService.evaluateIndexability(game, Optional.empty())).isFalse();
    }

    @Test
    void rejectsGamesYoungerThanMonitoringAge() {
        Game game = monitoredGame("valorant");
        game.setFirstMonitoredAt(LocalDateTime.now().minusHours(12));
        game.setLastTelemetryAt(LocalDateTime.now().minusMinutes(5));
        game.setLivePlayers(100_000L);

        assertThat(indexabilityService.evaluateIndexability(game, Optional.empty())).isFalse();
    }

    @Test
    void acceptsMatureGamesWithFreshTelemetryAndMetrics() {
        Game game = monitoredGame("valorant");
        game.setFirstMonitoredAt(LocalDateTime.now().minusHours(72));
        game.setLastTelemetryAt(LocalDateTime.now().minusMinutes(10));
        game.setTwitchViewers(50_000L);

        GameTelemetry telemetry = GameTelemetry.builder()
                .gameSlug("valorant")
                .status(TelemetryStatus.ONLINE)
                .latencyMs(42)
                .dataSource(TelemetrySource.NETWORK_PROBE)
                .lastChecked(LocalDateTime.now().minusMinutes(10))
                .build();

        assertThat(indexabilityService.evaluateIndexability(game, Optional.of(telemetry))).isTrue();
    }

    @Test
    void allowsApiOutageGraceWithoutBlockingOtherCriteria() {
        Game game = monitoredGame("valorant");
        game.setStaleReason(IndexabilityProperties.STALE_REASON_API_OUTAGE);
        game.setFirstMonitoredAt(LocalDateTime.now().minusHours(72));
        game.setLastTelemetryAt(LocalDateTime.now().minusMinutes(10));
        game.setLivePlayers(10_000L);

        assertThat(indexabilityService.evaluateIndexability(game, Optional.empty())).isTrue();
    }

    @Test
    void blocksStaleTelemetryReason() {
        Game game = monitoredGame("valorant");
        game.setStaleReason(IndexabilityProperties.STALE_REASON_STALE_TELEMETRY);
        game.setFirstMonitoredAt(LocalDateTime.now().minusHours(72));
        game.setLastTelemetryAt(LocalDateTime.now().minusMinutes(10));
        game.setLivePlayers(10_000L);

        assertThat(indexabilityService.evaluateIndexability(game, Optional.empty())).isFalse();
    }

    private Game monitoredGame(String slug) {
        return Game.builder()
                .slug(slug)
                .gameName("Valorant")
                .lifecycleState(LifecycleState.MONITORED)
                .initialTelemetryReady(true)
                .scrapeTier(1)
                .build();
    }
}
