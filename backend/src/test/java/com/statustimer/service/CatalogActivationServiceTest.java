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
import java.time.LocalDateTime;
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

    @Mock
    private IndexabilityService indexabilityService;

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
        verify(harvestScheduleService).bumpScheduleAfterUserInterest(eq("random-steam-game"));
        verify(gameCatalogService).ensureCatalogMetricsScheduleReady(eq("random-steam-game"));
        verify(indexabilityService).recalculateForSlug(eq("random-steam-game"));
    }

    @Test
    void activationMaterializesCatalogGameWhenMissingFromDatabase() {
        Game materialized = Game.builder()
                .slug("brand-new-steam-title")
                .gameName("Brand New Steam Title")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(424242)
                .initialTelemetryReady(false)
                .build();

        when(gameSlugMapper.resolveCanonicalSlug("brand-new-steam-title")).thenReturn("brand-new-steam-title");
        when(gameRepository.findBySlug("brand-new-steam-title"))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(materialized));
        when(gameCatalogService.materializeCatalogGameOnDemand("brand-new-steam-title"))
                .thenReturn(Optional.of(materialized));
        when(scrapeJobService.enqueueFullJob("brand-new-steam-title")).thenReturn(true);

        var response = catalogActivationService.activateOnDemand("brand-new-steam-title");

        assertThat(response.promoted()).isFalse();
        assertThat(response.jobQueued()).isTrue();
        verify(gameCatalogService).materializeCatalogGameOnDemand(eq("brand-new-steam-title"));
        verify(gameCatalogService).enrichCatalogProfileOnDemand(eq("brand-new-steam-title"));
        verify(gameCatalogService).ensureCatalogMetricsScheduleReady(eq("brand-new-steam-title"));
        verify(indexabilityService).recalculateForSlug(eq("brand-new-steam-title"));
    }

    @Test
    void activationQueuesCatalogSteamHarvestOnVisit() {
        Game game = Game.builder()
                .slug("resident-evil-village")
                .gameName("Resident Evil Village")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(1196590)
                .initialTelemetryReady(false)
                .build();

        when(gameSlugMapper.resolveCanonicalSlug("resident-evil-village")).thenReturn("resident-evil-village");
        when(gameRepository.findBySlug("resident-evil-village")).thenReturn(Optional.of(game));

        var response = catalogActivationService.activateOnDemand("resident-evil-village");

        assertThat(response.telemetryReady()).isFalse();
        verify(harvestScheduleService).bumpScheduleAfterUserInterest(eq("resident-evil-village"));
        verify(gameCatalogService).ensureCatalogMetricsScheduleReady(eq("resident-evil-village"));
        verify(indexabilityService).recalculateForSlug(eq("resident-evil-village"));
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
        verify(gameCatalogService).refreshSteamStoreMetadataOnVisit(eq("apex-legends"));
        verify(indexabilityService).recalculateForSlug(eq("apex-legends"));
    }

    @Test
    void activationRequeuesJobWhenCatalogTelemetryIsStale() {
        Game game = Game.builder()
                .slug("stale-steam-game")
                .gameName("Stale Steam Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(999_002)
                .initialTelemetryReady(true)
                .lastTelemetryAt(LocalDateTime.now().minusHours(30))
                .build();

        when(gameSlugMapper.resolveCanonicalSlug("stale-steam-game")).thenReturn("stale-steam-game");
        when(gameRepository.findBySlug("stale-steam-game")).thenReturn(Optional.of(game));
        when(scrapeJobService.enqueueFullJob("stale-steam-game")).thenReturn(true);

        var response = catalogActivationService.activateOnDemand("stale-steam-game");

        assertThat(response.promoted()).isFalse();
        assertThat(response.jobQueued()).isTrue();
        assertThat(response.telemetryReady()).isTrue();
        assertThat(game.getLifecycleState()).isEqualTo(LifecycleState.CATALOG);
        verify(harvestScheduleService).bumpScheduleAfterUserInterest(eq("stale-steam-game"));
        verify(gameCatalogService).ensureCatalogMetricsScheduleReady(eq("stale-steam-game"));
        verify(indexabilityService).recalculateForSlug(eq("stale-steam-game"));
    }
}
