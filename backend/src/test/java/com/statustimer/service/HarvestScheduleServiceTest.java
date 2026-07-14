package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.config.HarvestScheduleProperties;
import com.statustimer.dto.request.CompleteHarvestWorkRequest;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.HarvestWorkType;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class HarvestScheduleServiceTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameTelemetryRepository gameTelemetryRepository;

    @Mock
    private GameCatalogService gameCatalogService;

    @Mock
    private HarvestScheduleProperties harvestScheduleProperties;

    @InjectMocks
    private HarvestScheduleService harvestScheduleService;

    @Test
    void bumpScheduleAfterUserInterestAlsoBumpsNews() {
        Game game = Game.builder()
                .slug("apex-legends")
                .lifecycleState(LifecycleState.MONITORED)
                .nextTelemetryAt(LocalDateTime.now().plusHours(2))
                .nextMetricsAt(LocalDateTime.now().plusHours(4))
                .nextNewsAt(LocalDateTime.now().plusDays(3))
                .build();

        when(gameRepository.findBySlug("apex-legends")).thenReturn(Optional.of(game));

        harvestScheduleService.bumpScheduleAfterUserInterest("apex-legends");

        ArgumentCaptor<Game> saved = ArgumentCaptor.forClass(Game.class);
        verify(gameRepository).save(saved.capture());

        Game updated = saved.getValue();
        assertThat(updated.getNextTelemetryAt()).isBeforeOrEqualTo(LocalDateTime.now().plusSeconds(2));
        assertThat(updated.getNextMetricsAt()).isBeforeOrEqualTo(LocalDateTime.now().plusSeconds(2));
        assertThat(updated.getNextNewsAt()).isBeforeOrEqualTo(LocalDateTime.now().plusSeconds(2));
    }

    @Test
    void completeWorkUsesTierOneTelemetryIntervalWhenGameIsInMaintenance() {
        when(harvestScheduleProperties.telemetryMinutesForTier(1)).thenReturn(10);

        Game game = Game.builder()
                .slug("teamfight-tactics")
                .lifecycleState(LifecycleState.MONITORED)
                .scrapeTier(3)
                .build();

        when(gameRepository.findBySlug("teamfight-tactics")).thenReturn(Optional.of(game));
        when(gameTelemetryRepository.findByGame_Slug("teamfight-tactics")).thenReturn(Optional.of(
                GameTelemetry.builder()
                        .status(TelemetryStatus.MAINTENANCE)
                        .build()
        ));

        harvestScheduleService.completeWork(new CompleteHarvestWorkRequest(List.of(
                new CompleteHarvestWorkRequest.HarvestWorkResultPayload(
                        "teamfight-tactics",
                        HarvestWorkType.TELEMETRY,
                        true
                )
        )));

        ArgumentCaptor<Game> saved = ArgumentCaptor.forClass(Game.class);
        verify(gameRepository).save(saved.capture());

        Game updated = saved.getValue();
        assertThat(updated.getNextTelemetryAt()).isAfter(LocalDateTime.now().plusMinutes(9));
        assertThat(updated.getNextTelemetryAt()).isBefore(LocalDateTime.now().plusMinutes(11));
    }

    @Test
    void getDueWorkloadIncludesDegradedGamesEvenWhenNextTelemetryIsLater() {
        when(harvestScheduleProperties.maxTelemetryPerCycle()).thenReturn(50);
        when(harvestScheduleProperties.maxMetricsPerCycle()).thenReturn(50);
        when(harvestScheduleProperties.maxNewsPerCycle()).thenReturn(20);

        Game degradedGame = Game.builder()
                .slug("teamfight-tactics")
                .gameName("Teamfight Tactics")
                .lifecycleState(LifecycleState.MONITORED)
                .scrapeTier(3)
                .nextTelemetryAt(LocalDateTime.now().plusHours(4))
                .build();

        GameTelemetry telemetry = GameTelemetry.builder()
                .game(degradedGame)
                .status(TelemetryStatus.MAINTENANCE)
                .build();

        when(gameRepository.findByLifecycleStateInAndNextTelemetryAtLessThanEqualOrderByScrapeTierAsc(
                eq(Set.of(LifecycleState.MONITORED, LifecycleState.INDEXABLE)),
                any(LocalDateTime.class),
                any(Pageable.class)
        )).thenReturn(List.of());

        when(gameTelemetryRepository.findDegradedActiveMonitoring(
                eq(Set.of(TelemetryStatus.DOWN, TelemetryStatus.MAINTENANCE)),
                eq(Set.of(LifecycleState.MONITORED, LifecycleState.INDEXABLE)),
                any(Pageable.class)
        )).thenReturn(List.of(telemetry));

        when(gameRepository.findByLifecycleStateInAndNextMetricsAtLessThanEqualOrderByScrapeTierAsc(
                any(),
                any(),
                any(Pageable.class)
        )).thenReturn(List.of());
        when(gameRepository.findByLifecycleStateInAndNextNewsAtLessThanEqualOrderByScrapeTierAsc(
                any(),
                any(),
                any(Pageable.class)
        )).thenReturn(List.of());

        var workload = harvestScheduleService.getDueWorkload();

        assertThat(workload.telemetryDue()).hasSize(1);
        assertThat(workload.telemetryDue().getFirst().slug()).isEqualTo("teamfight-tactics");
    }
}
