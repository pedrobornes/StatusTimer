package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.statustimer.entity.Game;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PinnedGamePolicyTest {

    @Test
    void acceptsCounterStrike2IgdbMatch() {
        IgdbGameMatch match = new IgdbGameMatch(
                242_408L,
                "Counter-Strike 2",
                "counter-strike-2",
                "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar439t.jpg",
                "https://images.igdb.com/igdb/image/upload/t_cover_big/coaczd.jpg",
                730,
                90,
                88,
                List.of("Shooter"),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        assertTrue(PinnedGamePolicy.matchesIgdbGame("counter-strike-2", match));
    }

    @Test
    void rejectsLegacyCounterStrikeIgdbMatch() {
        IgdbGameMatch match = new IgdbGameMatch(
                1L,
                "Counter-Strike",
                "counter-strike",
                "https://images.igdb.com/igdb/image/upload/t_cover_big/legacy.jpg",
                "https://images.igdb.com/igdb/image/upload/t_cover_big/legacy.jpg",
                10,
                80,
                75,
                List.of("Shooter"),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        assertFalse(PinnedGamePolicy.matchesIgdbGame("counter-strike-2", match));
        assertTrue(PinnedGamePolicy.isBlockedSteamAppId("counter-strike-2", 10));
    }

    @Test
    void detectsCorruptCounterStrikeAssets() {
        Game game = Game.builder()
                .slug("counter-strike-2")
                .gameName("Counter-Strike 2")
                .steamAppId(10)
                .build();

        assertTrue(PinnedGamePolicy.needsAssetRefresh(game));
    }

    @Test
    void separatesPathOfExileFromPathOfExile2() {
        IgdbGameMatch poe2 = new IgdbGameMatch(
                125_642L,
                "Path of Exile 2",
                "path-of-exile-2",
                "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar37ie.jpg",
                "https://images.igdb.com/igdb/image/upload/t_cover_big/co8ae0.jpg",
                2_694_490,
                88,
                78,
                List.of("Role-playing (RPG)"),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        assertFalse(PinnedGamePolicy.matchesIgdbGame("path-of-exile", poe2));
        assertTrue(PinnedGamePolicy.isBlockedSteamAppId("path-of-exile", 2_694_490));
        assertTrue(PinnedGamePolicy.matchesIgdbGame("path-of-exile-2", poe2));
        assertTrue(PinnedGamePolicy.isBlockedSteamAppId("path-of-exile-2", 238960));
    }

    @Test
    void detectsCorruptPathOfExileSteamBinding() {
        Game game = Game.builder()
                .slug("path-of-exile")
                .gameName("Path of Exile")
                .steamAppId(2_694_490)
                .build();

        assertTrue(PinnedGamePolicy.needsAssetRefresh(game));
    }
}
