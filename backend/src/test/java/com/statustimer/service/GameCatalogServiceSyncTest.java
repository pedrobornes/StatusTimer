package com.statustimer.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.statustimer.dto.request.GameCatalogEntryPayload;
import com.statustimer.dto.request.SyncGameCatalogRequest;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GameCatalogServiceSyncTest {

    @Autowired
    private GameCatalogService gameCatalogService;

    @Autowired
    private GameRepository gameRepository;

    @BeforeEach
    void seedGames() {
        ensureGame("valorant", "Valorant", true);
        ensureGame("counter-strike-2", "Counter-Strike 2", false);
    }

    @Test
    void syncCatalogUpdatesManualProtectedTwitchMetrics() {
        Game existing = gameRepository.findBySlug("valorant").orElseThrow();
        existing.setLogoUrl("none");
        gameRepository.save(existing);

        var response = gameCatalogService.syncCatalog(new SyncGameCatalogRequest(
                List.of(new GameCatalogEntryPayload(
                        "valorant",
                        "Valorant",
                        null,
                        "https://images.igdb.com/igdb/image/upload/t_thumb/co2mvt.jpg",
                        "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.jpg",
                        "516575",
                        2,
                        null,
                        135_611L,
                        false,
                        null,
                        null,
                        null,
                        null,
                        List.of(),
                        List.of()
                ))
        ));

        assertEquals(1, response.updated());

        Game updated = gameRepository.findBySlug("valorant").orElseThrow();
        assertEquals(existing.getId(), updated.getId());
        assertEquals(135_611L, updated.getTwitchViewers());
        assertEquals("516575", updated.getTwitchGameId());
        assertEquals(2, updated.getTwitchRank());
        assertEquals(
                "https://images.igdb.com/igdb/image/upload/t_thumb/co2mvt.jpg",
                updated.getLogoUrl()
        );
    }

    @Test
    void syncCatalogMapsTwitchSlugToMonitoredTitleForMetrics() {
        Game existing = gameRepository.findBySlug("counter-strike-2").orElseThrow();

        gameCatalogService.syncCatalog(new SyncGameCatalogRequest(
                List.of(new GameCatalogEntryPayload(
                        "counter-strike",
                        "Counter-Strike",
                        null,
                        null,
                        null,
                        "32399",
                        6,
                        null,
                        62_172L,
                        false,
                        null,
                        null,
                        null,
                        null,
                        List.of(),
                        List.of()
                ))
        ));

        Game updated = gameRepository.findBySlug("counter-strike-2").orElseThrow();
        assertEquals(existing.getId(), updated.getId());
        assertEquals(62_172L, updated.getTwitchViewers());
        assertNotNull(updated.getTwitchGameId());
    }

    private void ensureGame(String slug, String gameName, boolean featured) {
        if (gameRepository.findBySlug(slug).isPresent()) {
            return;
        }
        gameRepository.save(Game.builder()
                .slug(slug)
                .gameName(gameName)
                .featured(featured)
                .manualLock(false)
                .lifecycleState(LifecycleState.MONITORED)
                .scrapeTier(featured ? 1 : 2)
                .build());
    }
}
