package com.statustimer.config;

import com.statustimer.service.TelemetryDailyRollupService;
import com.statustimer.service.TelemetryHistoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelemetryHistoryPurgeScheduler {

    private final TelemetryHistoryService telemetryHistoryService;
    private final TelemetryDailyRollupService telemetryDailyRollupService;

    @Scheduled(fixedDelayString = "${telemetry.history.purge-interval-ms:3600000}")
    public void purgeExpiredHistory() {
        int deleted = telemetryHistoryService.purgeExpiredSnapshots();
        if (deleted > 0) {
            log.info("Purged {} telemetry history rows older than retention window", deleted);
        }
    }

    @Scheduled(fixedDelayString = "${telemetry.history.purge-interval-ms:3600000}")
    public void purgeExpiredRollups() {
        int deleted = telemetryDailyRollupService.purgeExpiredRollups();
        if (deleted > 0) {
            log.info("Purged {} telemetry daily rollup rows past retention window", deleted);
        }
    }
}
