package com.statustimer.service;

import com.statustimer.config.TelemetryHistoryProperties;
import com.statustimer.config.TelemetryRollupProperties;
import com.statustimer.dto.response.TelemetryUptimeSummaryResponse;
import com.statustimer.entity.GameTelemetryHistory;
import com.statustimer.entity.TelemetryDailyRollup;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameTelemetryHistoryRepository;
import com.statustimer.repository.TelemetryDailyRollupRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryDailyRollupService {

    private final TelemetryDailyRollupRepository telemetryDailyRollupRepository;
    private final GameTelemetryHistoryRepository gameTelemetryHistoryRepository;
    private final TelemetryHistoryProperties telemetryHistoryProperties;
    private final TelemetryRollupProperties telemetryRollupProperties;

    @Transactional
    public void recordSnapshot(
            String gameSlug,
            TelemetryStatus status,
            LocalDateTime checkedAt
    ) {
        LocalDate rollupDate = checkedAt.toLocalDate();
        TelemetryDailyRollup rollup = telemetryDailyRollupRepository
                .findByGameSlugAndRollupDate(gameSlug, rollupDate)
                .orElseGet(() -> TelemetryDailyRollup.builder()
                        .gameSlug(gameSlug)
                        .rollupDate(rollupDate)
                        .sampleCount(0)
                        .onlineSamples(0)
                        .maintenanceSamples(0)
                        .downSamples(0)
                        .upcomingSamples(0)
                        .updatedAt(checkedAt)
                        .build());

        rollup.recordStatus(status, checkedAt);
        telemetryDailyRollupRepository.save(rollup);
    }

    @Transactional(readOnly = true)
    public TelemetryUptimeSummaryResponse summarizeUptime(String gameSlug) {
        return new TelemetryUptimeSummaryResponse(
                calculateUptimePercent(gameSlug, 7),
                calculateUptimePercent(gameSlug, 30)
        );
    }

    @Transactional
    public int backfillFromHistory(String gameSlug) {
        LocalDateTime since = LocalDateTime.now()
                .minusHours(telemetryHistoryProperties.retentionHours());
        List<GameTelemetryHistory> snapshots =
                gameTelemetryHistoryRepository.findByGameSlugAndCheckedAtAfterOrderByCheckedAtAsc(
                        gameSlug,
                        since
                );

        if (snapshots.isEmpty()) {
            return 0;
        }

        Map<LocalDate, TelemetryDailyRollup> rollupsByDate = new HashMap<>();

        for (GameTelemetryHistory snapshot : snapshots) {
            LocalDate rollupDate = snapshot.getCheckedAt().toLocalDate();
            TelemetryDailyRollup rollup = rollupsByDate.computeIfAbsent(
                    rollupDate,
                    date -> TelemetryDailyRollup.builder()
                            .gameSlug(gameSlug)
                            .rollupDate(date)
                            .sampleCount(0)
                            .onlineSamples(0)
                            .maintenanceSamples(0)
                            .downSamples(0)
                            .upcomingSamples(0)
                            .updatedAt(snapshot.getCheckedAt())
                            .build()
            );
            rollup.recordStatus(snapshot.getStatus(), snapshot.getCheckedAt());
        }

        int upserted = 0;
        for (TelemetryDailyRollup rollup : rollupsByDate.values()) {
            TelemetryDailyRollup existing = telemetryDailyRollupRepository
                    .findByGameSlugAndRollupDate(gameSlug, rollup.getRollupDate())
                    .orElse(null);

            if (existing == null) {
                telemetryDailyRollupRepository.save(rollup);
                upserted++;
                continue;
            }

            if (rollup.getSampleCount() > existing.getSampleCount()) {
                existing.setSampleCount(rollup.getSampleCount());
                existing.setOnlineSamples(rollup.getOnlineSamples());
                existing.setMaintenanceSamples(rollup.getMaintenanceSamples());
                existing.setDownSamples(rollup.getDownSamples());
                existing.setUpcomingSamples(rollup.getUpcomingSamples());
                existing.setUpdatedAt(rollup.getUpdatedAt());
                telemetryDailyRollupRepository.save(existing);
                upserted++;
            }
        }

        return upserted;
    }

    @Transactional
    public int purgeExpiredRollups() {
        LocalDate cutoff = LocalDate.now().minusDays(telemetryRollupProperties.retentionDays());
        return telemetryDailyRollupRepository.deleteByRollupDateBefore(cutoff);
    }

    private Integer calculateUptimePercent(String gameSlug, int days) {
        LocalDate windowStart = LocalDate.now().minusDays(days - 1L);
        List<TelemetryDailyRollup> rollups = telemetryDailyRollupRepository
                .findByGameSlugAndRollupDateGreaterThanEqual(gameSlug, windowStart);

        int onlineSamples = 0;
        int totalSamples = 0;

        for (TelemetryDailyRollup rollup : rollups) {
            onlineSamples += rollup.getOnlineSamples();
            totalSamples += rollup.getSampleCount();
        }

        if (totalSamples < telemetryRollupProperties.minimumSamples()) {
            return null;
        }

        return Math.round((onlineSamples * 100f) / totalSamples);
    }
}
