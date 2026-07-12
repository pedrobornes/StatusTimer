package com.statustimer.config;

import com.statustimer.repository.GameRepository;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Pulls ALWAYS_TIER_1 games onto the fast telemetry schedule after deploys or tier drift.
 */
@Component
@Order(0)
@RequiredArgsConstructor
@Slf4j
public class AlwaysTierOneScheduleBootstrap implements CommandLineRunner {

    private static final int STALE_SCHEDULE_GRACE_MINUTES = 15;

    private final GameRepository gameRepository;

    @Override
    public void run(String... args) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime staleScheduleCutoff = now.plusMinutes(STALE_SCHEDULE_GRACE_MINUTES);
        int updated = 0;

        for (String slug : AlwaysTierOneSlugs.SLUGS) {
            updated += gameRepository.findBySlug(slug)
                    .map(game -> {
                        boolean changed = false;

                        if (game.getScrapeTier() == null || game.getScrapeTier() != 1) {
                            game.setScrapeTier(1);
                            changed = true;
                        }

                        if (game.getNextTelemetryAt() == null
                                || game.getNextTelemetryAt().isAfter(staleScheduleCutoff)) {
                            game.setNextTelemetryAt(now);
                            changed = true;
                        }

                        if (changed) {
                            gameRepository.save(game);
                            return 1;
                        }

                        return 0;
                    })
                    .orElse(0);
        }

        if (updated > 0) {
            log.info("Bootstrapped ALWAYS_TIER_1 telemetry schedule for {} game(s).", updated);
        }
    }
}
