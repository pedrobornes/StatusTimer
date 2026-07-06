package com.statustimer.config;

import com.statustimer.repository.TrackedGameRepository;
import com.statustimer.service.TelemetryDailyRollupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class TelemetryRollupBackfillRunner implements CommandLineRunner {

    private final TrackedGameRepository trackedGameRepository;
    private final TelemetryDailyRollupService telemetryDailyRollupService;

    @Override
    public void run(String... args) {
        int totalUpserted = 0;

        for (var game : trackedGameRepository.findAll()) {
            totalUpserted += telemetryDailyRollupService.backfillFromHistory(game.getSlug());
        }

        if (totalUpserted > 0) {
            log.info("Backfilled {} telemetry daily rollup day(s) from recent history", totalUpserted);
        }
    }
}
