package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.statustimer.config.IndexabilityProperties;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryRepository;
import com.statustimer.repository.GamingNewsRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * SEO indexability: empty CATALOG shells stay noindex; popular Steam launches with
 * news can index immediately and stay indexed during a grace window if viewers dip.
 */
@ExtendWith(MockitoExtension.class)
class IndexabilityServiceTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameTelemetryRepository gameTelemetryRepository;

    @Mock
    private GamingNewsRepository gamingNewsRepository;

    private IndexabilityService service;

    @BeforeEach
    void setUp() {
        service = new IndexabilityService(
                gameRepository,
                gameTelemetryRepository,
                gamingNewsRepository,
                new IndexabilityProperties(48, 24, 48, 72, 900_000L, 1, 5_000, 14)
        );
    }

    @Test
    void catalogGameWithoutNewsOrAudienceIsNotIndexable() {
        Game game = Game.builder()
                .slug("empty-catalog-shell")
                .gameName("Empty Catalog Shell")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(111)
                .build();

        assertThat(service.evaluateIndexability(game, Optional.empty())).isFalse();
    }

    @Test
    void catalogSteamWithNewsButBelowTwitchThresholdIsNotIndexable() {
        Game game = Game.builder()
                .slug("small-stream-game")
                .gameName("Small Stream Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(222)
                .twitchViewers(4_999L)
                .build();

        assertThat(service.evaluateIndexability(game, Optional.empty())).isFalse();
    }

    @Test
    void catalogSteamLaunchWithNewsAndPopularTwitchIsIndexable() {
        Game game = Game.builder()
                .slug("mistfall-hunter")
                .gameName("Mistfall Hunter")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(3282300)
                .twitchViewers(28_501L)
                .build();

        when(gamingNewsRepository.countForGameSlug("mistfall-hunter", "mistfall-hunter"))
                .thenReturn(3L);

        assertThat(service.evaluateIndexability(game, Optional.empty())).isTrue();
    }

    @Test
    void catalogSteamLaunchWithNewsAndZeroLivePlayersIsIndexable() {
        Game game = Game.builder()
                .slug("sampled-steam-game")
                .gameName("Sampled Steam Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(424242)
                .livePlayers(0L)
                .build();

        when(gamingNewsRepository.countForGameSlug(eq("sampled-steam-game"), anyString()))
                .thenReturn(1L);

        assertThat(service.evaluateIndexability(game, Optional.empty())).isTrue();
    }

    @Test
    void promotedLaunchStaysIndexableDuringGraceWhenViewersDrop() {
        Game game = Game.builder()
                .slug("mistfall-hunter")
                .gameName("Mistfall Hunter")
                .lifecycleState(LifecycleState.INDEXABLE)
                .steamAppId(3282300)
                .twitchViewers(800L)
                .initialTelemetryReady(true)
                .firstMonitoredAt(LocalDateTime.now().minusDays(3))
                .build();

        when(gamingNewsRepository.countForGameSlug("mistfall-hunter", "mistfall-hunter"))
                .thenReturn(3L);

        assertThat(service.evaluateIndexability(game, Optional.empty())).isTrue();
    }

    @Test
    void promotedLaunchLosesStickyIndexAfterGraceWithoutNormalSignals() {
        Game game = Game.builder()
                .slug("mistfall-hunter")
                .gameName("Mistfall Hunter")
                .lifecycleState(LifecycleState.INDEXABLE)
                .steamAppId(3282300)
                .twitchViewers(800L)
                .initialTelemetryReady(true)
                .firstMonitoredAt(LocalDateTime.now().minusDays(20))
                .build();

        when(gamingNewsRepository.countForGameSlug("mistfall-hunter", "mistfall-hunter"))
                .thenReturn(3L);

        assertThat(service.evaluateIndexability(game, Optional.empty())).isFalse();
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
        game.setSteamAppId(null);

        assertThat(service.evaluateIndexability(game, Optional.of(probeTelemetry(game))))
                .isFalse();
    }

    @Test
    void noProbeSignalAndNoLiveMetricsIsNotIndexable() {
        Game game = qualifiedGame();
        game.setLivePlayers(0L);
        game.setTwitchViewers(0L);
        game.setSteamAppId(null);
        game.setFirstMonitoredAt(LocalDateTime.now().minusDays(20));

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
