package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HarvestScheduleServiceTest {

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameCatalogService gameCatalogService;

    @Mock
    private com.statustimer.config.HarvestScheduleProperties harvestScheduleProperties;

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
}
