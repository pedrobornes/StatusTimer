package com.statustimer.config;

import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import com.statustimer.service.GameCatalogService;
import com.statustimer.service.GameTelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(-1)
@RequiredArgsConstructor
public class TrackedGameCatalogSeeder implements CommandLineRunner {

    private final GameRepository gameRepository;
    private final GameCatalogService gameCatalogService;
    private final GameTelemetryService gameTelemetryService;

    @Override
    public void run(String... args) {
        gameCatalogService.seedTrackedCatalogIfMissing();

        for (var game : gameRepository.findAll()) {
            if (game.getLifecycleState() == null) {
                game.setLifecycleState(LifecycleState.MONITORED);
            }
            if (game.getScrapeTier() == null) {
                game.setScrapeTier(Boolean.TRUE.equals(game.getFeatured()) ? 1 : 2);
            }
            gameRepository.save(game);
        }

        gameTelemetryService.consolidateSlugAliases();
        gameCatalogService.enrichMissingLogos();
    }
}
