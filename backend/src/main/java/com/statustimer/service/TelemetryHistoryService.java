package com.statustimer.service;

import com.statustimer.config.TelemetryHistoryProperties;
import com.statustimer.entity.GameTelemetryHistory;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.entity.TrackedGame;
import com.statustimer.repository.GameTelemetryHistoryRepository;
import com.statustimer.repository.TrackedGameRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelemetryHistoryService {

    private final GameTelemetryHistoryRepository gameTelemetryHistoryRepository;
    private final TrackedGameRepository trackedGameRepository;
    private final TelemetryHistoryProperties telemetryHistoryProperties;
    private final TelemetryDailyRollupService telemetryDailyRollupService;

    @Transactional
    public void appendSnapshotIfNeeded(
            String gameSlug,
            TelemetryStatus status,
            TelemetrySource dataSource,
            LocalDateTime checkedAt
    ) {
        if (!shouldAppendSnapshot(gameSlug, status, checkedAt)) {
            return;
        }

        gameTelemetryHistoryRepository.save(GameTelemetryHistory.builder()
                .gameSlug(gameSlug)
                .status(status)
                .dataSource(dataSource)
                .checkedAt(checkedAt)
                .build());

        telemetryDailyRollupService.recordSnapshot(gameSlug, status, checkedAt);
    }

    @Transactional(readOnly = true)
    public LocalDateTime historyReadWindowStart() {
        return LocalDateTime.now().minusHours(telemetryHistoryProperties.retentionHours());
    }

    @Transactional
    public int purgeExpiredSnapshots() {
        LocalDateTime cutoff = historyReadWindowStart();
        int totalDeleted = 0;

        while (true) {
            List<Long> batchIds = gameTelemetryHistoryRepository.findIdsByCheckedAtBefore(
                    cutoff,
                    PageRequest.of(0, telemetryHistoryProperties.purgeBatchSize())
            );

            if (batchIds.isEmpty()) {
                break;
            }

            totalDeleted += gameTelemetryHistoryRepository.deleteByIdIn(batchIds);
        }

        return totalDeleted;
    }

    private boolean shouldAppendSnapshot(
            String gameSlug,
            TelemetryStatus status,
            LocalDateTime checkedAt
    ) {
        return gameTelemetryHistoryRepository.findTopByGameSlugOrderByCheckedAtDesc(gameSlug)
                .map(latest -> shouldAppendAfterLatest(latest, gameSlug, status, checkedAt))
                .orElse(true);
    }

    private boolean shouldAppendAfterLatest(
            GameTelemetryHistory latest,
            String gameSlug,
            TelemetryStatus status,
            LocalDateTime checkedAt
    ) {
        if (latest.getStatus() != status) {
            return true;
        }

        int heartbeatMinutes = resolveHeartbeatMinutes(gameSlug);
        LocalDateTime nextHeartbeatAt = latest.getCheckedAt().plusMinutes(heartbeatMinutes);
        return !checkedAt.isBefore(nextHeartbeatAt);
    }

    private int resolveHeartbeatMinutes(String gameSlug) {
        return trackedGameRepository.findBySlug(gameSlug)
                .map(TrackedGame::getScrapeTier)
                .map(telemetryHistoryProperties::heartbeatMinutesForTier)
                .orElse(telemetryHistoryProperties.heartbeatMinutesTier2());
    }
}
