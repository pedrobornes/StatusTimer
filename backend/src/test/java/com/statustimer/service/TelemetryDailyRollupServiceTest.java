package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.config.TelemetryHistoryProperties;
import com.statustimer.config.TelemetryRollupProperties;
import com.statustimer.entity.Game;
import com.statustimer.entity.TelemetryDailyRollup;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryHistoryRepository;
import com.statustimer.repository.TelemetryDailyRollupRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TelemetryDailyRollupServiceTest {

    @Mock
    private TelemetryDailyRollupRepository telemetryDailyRollupRepository;

    @Mock
    private GameTelemetryHistoryRepository gameTelemetryHistoryRepository;

    @Mock
    private GameRepository gameRepository;

    private TelemetryDailyRollupService telemetryDailyRollupService;

    @BeforeEach
    void setUp() {
        telemetryDailyRollupService = new TelemetryDailyRollupService(
                telemetryDailyRollupRepository,
                gameTelemetryHistoryRepository,
                gameRepository,
                new TelemetryHistoryProperties(30, 60, 120, 72, 500, 3_600_000L),
                new TelemetryRollupProperties(90, 5)
        );
    }

    @Test
    void recordSnapshotCreatesDailyRollup() {
        LocalDateTime checkedAt = LocalDateTime.of(2026, 7, 6, 12, 0);
        Game game = valorantGame();
        when(gameRepository.findBySlug("valorant")).thenReturn(Optional.of(game));
        when(telemetryDailyRollupRepository.findByGame_SlugAndRollupDate(
                "valorant",
                checkedAt.toLocalDate()
        )).thenReturn(Optional.empty());
        when(telemetryDailyRollupRepository.save(any(TelemetryDailyRollup.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        telemetryDailyRollupService.recordSnapshot("valorant", TelemetryStatus.ONLINE, checkedAt);

        ArgumentCaptor<TelemetryDailyRollup> captor = ArgumentCaptor.forClass(TelemetryDailyRollup.class);
        verify(telemetryDailyRollupRepository).save(captor.capture());

        TelemetryDailyRollup rollup = captor.getValue();
        assertThat(rollup.getGame().getSlug()).isEqualTo("valorant");
        assertThat(rollup.getSampleCount()).isEqualTo(1);
        assertThat(rollup.getOnlineSamples()).isEqualTo(1);
    }

    @Test
    void summarizeUptimeReturnsPercentWhenEnoughSamples() {
        LocalDate today = LocalDate.now();
        when(telemetryDailyRollupRepository.findByGame_SlugAndRollupDateGreaterThanEqual(
                "valorant",
                today.minusDays(6)
        )).thenReturn(List.of(
                rollupDay(today, 8, 6),
                rollupDay(today.minusDays(1), 4, 2)
        ));
        when(telemetryDailyRollupRepository.findByGame_SlugAndRollupDateGreaterThanEqual(
                "valorant",
                today.minusDays(29)
        )).thenReturn(List.of(
                rollupDay(today, 8, 6),
                rollupDay(today.minusDays(1), 4, 2),
                rollupDay(today.minusDays(2), 10, 5)
        ));

        var summary = telemetryDailyRollupService.summarizeUptime("valorant");

        assertThat(summary.uptime7dPercent()).isEqualTo(67);
        assertThat(summary.uptime30dPercent()).isEqualTo(59);
    }

    @Test
    void summarizeUptimeReturnsNullWhenInsufficientSamples() {
        LocalDate today = LocalDate.now();
        when(telemetryDailyRollupRepository.findByGame_SlugAndRollupDateGreaterThanEqual(any(), any()))
                .thenReturn(List.of(rollupDay(today, 3, 2)));

        var summary = telemetryDailyRollupService.summarizeUptime("valorant");

        assertThat(summary.uptime7dPercent()).isNull();
        assertThat(summary.uptime30dPercent()).isNull();
    }

    private Game valorantGame() {
        return Game.builder()
                .slug("valorant")
                .gameName("Valorant")
                .build();
    }

    private TelemetryDailyRollup rollupDay(LocalDate date, int total, int online) {
        return TelemetryDailyRollup.builder()
                .game(valorantGame())
                .rollupDate(date)
                .sampleCount(total)
                .onlineSamples(online)
                .maintenanceSamples(0)
                .downSamples(total - online)
                .upcomingSamples(0)
                .updatedAt(date.atStartOfDay())
                .build();
    }
}
