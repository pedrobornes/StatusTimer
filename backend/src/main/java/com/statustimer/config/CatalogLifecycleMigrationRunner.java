package com.statustimer.config;

import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.Game;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryRepository;
import com.statustimer.service.GameCatalogService;
import com.statustimer.service.GamingNewsService;
import com.statustimer.service.HarvestScheduleService;
import com.statustimer.service.IndexabilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Order(0)
@RequiredArgsConstructor
@Slf4j
public class CatalogLifecycleMigrationRunner implements CommandLineRunner {

    private final GameRepository gameRepository;
    private final GameTelemetryRepository gameTelemetryRepository;
    private final GameCatalogService gameCatalogService;
    private final GamingNewsService gamingNewsService;
    private final IndexabilityService indexabilityService;
    private final HarvestScheduleService harvestScheduleService;

    @Override
    public void run(String... args) {
        int migrated = 0;

        for (Game game : gameRepository.findAll()) {
            if (backfillLifecycleFields(game)) {
                gameRepository.save(game);
                migrated++;
            }
            harvestScheduleService.ensureScheduleInitialized(game);
        }

        try {
            gameCatalogService.reconcileDuplicateCatalogSlugs();
        } catch (RuntimeException exception) {
            log.warn("Failed to reconcile duplicate catalog slugs during startup", exception);
        }

        try {
            gameCatalogService.reconcileProtectedTitleSpinoffs();
        } catch (RuntimeException exception) {
            log.warn("Failed to quarantine protected-title spinoffs during startup", exception);
        }

        try {
            gameCatalogService.reconcileExcludedCatalogProfiles();
        } catch (RuntimeException exception) {
            log.warn("Failed to quarantine excluded catalog profiles during startup", exception);
        }

        int removedNewsDuplicates = 0;
        try {
            removedNewsDuplicates = gamingNewsService.reconcileDuplicateNews();
        } catch (RuntimeException exception) {
            log.warn("Failed to reconcile duplicate gaming news rows during startup", exception);
        }

        indexabilityService.recalculateAll();
        gameCatalogService.enforceAllPinnedGamePolicies();
        gameCatalogService.reconcileSteamAdultContentFlags();
        gameCatalogService.reconcileSteamAppIds();
        gameCatalogService.reconcileGameTypes();

        if (migrated > 0) {
            log.info("Backfilled lifecycle fields for {} tracked games", migrated);
        }

        if (removedNewsDuplicates > 0) {
            log.info("Removed {} duplicate gaming news row(s)", removedNewsDuplicates);
        }
    }

    private boolean backfillLifecycleFields(Game game) {
        boolean changed = false;

        var telemetry = gameTelemetryRepository.findByGame_Slug(game.getSlug());

        if (game.getLifecycleState() == null) {
            game.setLifecycleState(LifecycleState.CATALOG);
            changed = true;
        }

        if (telemetry.isPresent() && game.getLastTelemetryAt() == null) {
            game.setLastTelemetryAt(telemetry.get().getLastChecked());
            changed = true;
        }

        if (telemetry.isPresent() && game.getFirstMonitoredAt() == null) {
            LocalDateTime monitoredAt = telemetry.get().getLastChecked();
            if (Boolean.TRUE.equals(game.getFeatured())) {
                monitoredAt = monitoredAt.minusHours(49);
            }
            game.setFirstMonitoredAt(monitoredAt);
            changed = true;
        }

        if (telemetry.isPresent() && !Boolean.TRUE.equals(game.getInitialTelemetryReady())) {
            game.setInitialTelemetryReady(true);
            changed = true;
        }

        if (game.getScrapeTier() == null) {
            game.setScrapeTier(Boolean.TRUE.equals(game.getFeatured()) ? 1 : 2);
            changed = true;
        }

        if ((game.getGenreNames() == null || game.getGenreNames().isEmpty())
                && game.getGenreName() != null
                && !game.getGenreName().isBlank()) {
            game.setGenreNames(java.util.List.of(game.getGenreName().trim()));
            changed = true;
        }

        return changed;
    }
}
