package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.config.GameSlugMapper;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CatalogActivationServiceTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameSlugMapper gameSlugMapper;

    @Mock
    private ScrapeJobService scrapeJobService;

    @Mock
    private HarvestScheduleService harvestScheduleService;

    @Mock
    private GameCatalogService gameCatalogService;

    @InjectMocks
    private CatalogActivationService catalogActivationService;

    @Test
    void activationDoesNotPromoteCatalogGameToMonitored() {
        Game game = Game.builder()
                .slug("random-steam-game")
                .gameName("Random Steam Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(999_001)
                .initialTelemetryReady(false)
                .build();

        when(gameSlugMapper.resolveCanonicalSlug("random-steam-game")).thenReturn("random-steam-game");
        when(gameRepository.findBySlug("random-steam-game")).thenReturn(Optional.of(game));
        when(scrapeJobService.enqueueFullJob("random-steam-game")).thenReturn(true);

        var response = catalogActivationService.activateOnDemand("random-steam-game");

        assertThat(response.promoted()).isFalse();
        assertThat(response.jobQueued()).isTrue();
        assertThat(game.getLifecycleState()).isEqualTo(LifecycleState.CATALOG);
        verify(harvestScheduleService, never()).ensureScheduleInitialized(any());
        verify(harvestScheduleService, never()).bumpScheduleAfterUserInterest(any());
    }

    @Test
    void activationBumpsScheduleForAlreadyMonitoredGame() {
        Game game = Game.builder()
                .slug("apex-legends")
                .gameName("Apex Legends")
                .lifecycleState(LifecycleState.MONITORED)
                .steamAppId(1172470)
                .initialTelemetryReady(true)
                .build();

        when(gameSlugMapper.resolveCanonicalSlug("apex-legends")).thenReturn("apex-legends");
        when(gameRepository.findBySlug("apex-legends")).thenReturn(Optional.of(game));

        var response = catalogActivationService.activateOnDemand("apex-legends");

        assertThat(response.promoted()).isFalse();
        assertThat(response.jobQueued()).isFalse();
        assertThat(game.getLifecycleState()).isEqualTo(LifecycleState.MONITORED);
        verify(harvestScheduleService).bumpScheduleAfterUserInterest(eq("apex-legends"));
    }
}
