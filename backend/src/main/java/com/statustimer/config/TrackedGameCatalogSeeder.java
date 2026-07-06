package com.statustimer.config;

import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TrackedGame;
import com.statustimer.repository.TrackedGameRepository;
import com.statustimer.service.GameCatalogService;
import com.statustimer.service.GameTelemetryService;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(-1)
@RequiredArgsConstructor
public class TrackedGameCatalogSeeder implements CommandLineRunner {

    private static final Set<String> MANUAL_LOCK_SLUGS = Set.of(
            "valorant",
            "fortnite",
            "gta-vi"
    );

    private final TrackedGameRepository trackedGameRepository;
    private final GameCatalogService gameCatalogService;
    private final GameTelemetryService gameTelemetryService;

    @Override
    public void run(String... args) {
        TrackedGameCatalog.allEntries().forEach((slug, metadata) -> {
            if (trackedGameRepository.findBySlug(slug).isPresent()) {
                return;
            }

            TrackedGame game = TrackedGame.builder()
                    .slug(slug)
                    .gameName(metadata.gameName())
                    .steamAppId(metadata.appId())
                    .featured(metadata.featured())
                    .manualLock(MANUAL_LOCK_SLUGS.contains(slug))
                    .lifecycleState(LifecycleState.MONITORED)
                    .scrapeTier(metadata.featured() ? 1 : 2)
                    .build();

            GameAssetPolicy.applyTo(game, null);
            trackedGameRepository.save(game);
        });

        gameTelemetryService.consolidateSlugAliases();
        gameCatalogService.enrichMissingLogos();
    }
}
