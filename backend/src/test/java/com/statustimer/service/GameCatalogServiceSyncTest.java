package com.statustimer.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.statustimer.dto.request.GameCatalogEntryPayload;
import com.statustimer.dto.request.SyncGameCatalogRequest;
import com.statustimer.entity.TrackedGame;
import com.statustimer.repository.TrackedGameRepository;
import java.util.List;
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
    private TrackedGameRepository trackedGameRepository;

    @Test
    void syncCatalogUpdatesManualProtectedTwitchMetrics() {
        TrackedGame existing = trackedGameRepository.findBySlug("valorant").orElseThrow();
        existing.setLogoUrl("none");
        trackedGameRepository.save(existing);

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
                        List.of(),
                        List.of()
                ))
        ));

        assertEquals(1, response.updated());

        TrackedGame updated = trackedGameRepository.findBySlug("valorant").orElseThrow();
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
        TrackedGame existing = trackedGameRepository.findBySlug("counter-strike-2").orElseThrow();

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
                        List.of(),
                        List.of()
                ))
        ));

        TrackedGame updated = trackedGameRepository.findBySlug("counter-strike-2").orElseThrow();
        assertEquals(existing.getId(), updated.getId());
        assertEquals(62_172L, updated.getTwitchViewers());
        assertNotNull(updated.getTwitchGameId());
    }
}
