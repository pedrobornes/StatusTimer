package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.config.LifecycleMonitorProperties;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class LifecycleMonitorServiceTest {

    @Mock
    private GameRepository gameRepository;

    private LifecycleMonitorService lifecycleMonitorService;

    private LifecycleMonitorProperties properties;

    @BeforeEach
    void setUp() {
        properties = new LifecycleMonitorProperties(500, 30, 25);
        lifecycleMonitorService = new LifecycleMonitorService(gameRepository, properties);
    }

    @Test
    void trackedCatalogGameQualifiesForPromotion() {
        Game game = catalogGame("counter-strike-2", 3, null);

        assertThat(lifecycleMonitorService.qualifiesForPromotion(game)).isTrue();
    }

    @Test
    void lowPriorityCatalogGameDoesNotQualifyForPromotion() {
        Game game = catalogGame("obscure-indie", 3, 200);

        assertThat(lifecycleMonitorService.qualifiesForPromotion(game)).isFalse();
    }

    @Test
    void trackedMonitoredGameIsProtectedFromDemotion() {
        Game game = monitoredGame("counter-strike-2", 3, null);
        game.setLastTelemetryAt(LocalDateTime.now().minusDays(60));

        assertThat(lifecycleMonitorService.isProtectedFromDemotion(game)).isTrue();
    }

    @Test
    void demotesInactiveLowPriorityMonitoredGame() {
        Game stale = monitoredGame("obscure-indie", 3, 120);
        stale.setLastTelemetryAt(LocalDateTime.now().minusDays(45));

        when(gameRepository.findByLifecycleState(LifecycleState.MONITORED))
                .thenReturn(List.of(stale));
        when(gameRepository.countByLifecycleStateIn(any())).thenReturn(1L);
        when(gameRepository.findByLifecycleState(LifecycleState.CATALOG)).thenReturn(List.of());

        LifecycleMonitorService.LifecycleMonitorReport report = lifecycleMonitorService.runMonitorCycle();

        assertThat(report.demoted()).isEqualTo(1);
        assertThat(stale.getLifecycleState()).isEqualTo(LifecycleState.CATALOG);
        assertThat(stale.getNextTelemetryAt()).isNull();
        verify(gameRepository).save(stale);
    }

    @Test
    void promotesEligibleCatalogGameWhenUnderCap() {
        Game candidate = catalogGame("apex-legends", 2, 10);

        when(gameRepository.findByLifecycleState(LifecycleState.MONITORED)).thenReturn(List.of());
        when(gameRepository.countByLifecycleStateIn(any())).thenReturn(10L, 11L);
        when(gameRepository.findByLifecycleState(LifecycleState.CATALOG)).thenReturn(List.of(candidate));

        LifecycleMonitorService.LifecycleMonitorReport report = lifecycleMonitorService.runMonitorCycle();

        assertThat(report.promoted()).isEqualTo(1);
        assertThat(candidate.getLifecycleState()).isEqualTo(LifecycleState.MONITORED);
        assertThat(candidate.getNextTelemetryAt()).isNotNull();
        verify(gameRepository).save(candidate);
    }

    @Test
    void doesNotPromoteWhenCapIsReached() {
        Game candidate = catalogGame("apex-legends", 2, 10);

        when(gameRepository.findByLifecycleState(LifecycleState.MONITORED)).thenReturn(List.of());
        when(gameRepository.countByLifecycleStateIn(any())).thenReturn(500L);

        LifecycleMonitorService.LifecycleMonitorReport report = lifecycleMonitorService.runMonitorCycle();

        assertThat(report.promoted()).isZero();
        assertThat(candidate.getLifecycleState()).isEqualTo(LifecycleState.CATALOG);
        verify(gameRepository, never()).save(candidate);
    }

    @Test
    void enforcesCapByDemotingLowestPriorityMonitoredGames() {
        Game protectedTracked = monitoredGame("counter-strike-2", 3, null);
        Game overflow = monitoredGame("overflow-game", 3, 500);
        overflow.setLastTelemetryAt(LocalDateTime.now().minusDays(1));

        when(gameRepository.findByLifecycleState(LifecycleState.MONITORED))
                .thenReturn(List.of(protectedTracked, overflow))
                .thenReturn(List.of(protectedTracked, overflow));
        when(gameRepository.countByLifecycleStateIn(any())).thenReturn(501L, 500L);

        LifecycleMonitorService.LifecycleMonitorReport report = lifecycleMonitorService.runMonitorCycle();

        assertThat(report.capDemoted()).isEqualTo(1);
        assertThat(overflow.getLifecycleState()).isEqualTo(LifecycleState.CATALOG);
        assertThat(protectedTracked.getLifecycleState()).isEqualTo(LifecycleState.MONITORED);

        ArgumentCaptor<Game> saved = ArgumentCaptor.forClass(Game.class);
        verify(gameRepository).save(saved.capture());
        assertThat(saved.getValue().getSlug()).isEqualTo("overflow-game");
    }

    private Game catalogGame(String slug, int tier, Integer twitchRank) {
        return Game.builder()
                .slug(slug)
                .gameName(slug)
                .lifecycleState(LifecycleState.CATALOG)
                .scrapeTier(tier)
                .twitchRank(twitchRank)
                .steamAppId(123)
                .build();
    }

    private Game monitoredGame(String slug, int tier, Integer twitchRank) {
        return Game.builder()
                .slug(slug)
                .gameName(slug)
                .lifecycleState(LifecycleState.MONITORED)
                .scrapeTier(tier)
                .twitchRank(twitchRank)
                .steamAppId(123)
                .build();
    }
}
