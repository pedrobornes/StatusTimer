package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.statustimer.entity.Game;
import org.junit.jupiter.api.Test;

class GameAssetPolicyTest {

    @Test
    void applyIgdbAssetsUpgradesUnsuitableHero() {
        Game game = Game.builder()
                .slug("grand-theft-auto-vi")
                .gameName("Grand Theft Auto VI")
                .logoUrl("https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc10vlj.jpg")
                .build();

        GameAssetPolicy.applyIgdbAssets(
                game,
                "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar52fz.jpg",
                "https://images.igdb.com/igdb/image/upload/t_cover_big/cocaa5.jpg"
        );

        assertEquals(
                "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar52fz.jpg",
                game.getLogoUrl()
        );
    }

    @Test
    void applyIgdbAssetsPersistsLogoAndCoverUrls() {
        Game game = Game.builder()
                .slug("grand-theft-auto-vi")
                .gameName("Grand Theft Auto VI")
                .build();

        GameAssetPolicy.applyIgdbAssets(
                game,
                "https://images.igdb.com/igdb/image/upload/t_thumb/logo.jpg",
                "https://images.igdb.com/igdb/image/upload/t_cover_big/cover.jpg"
        );

        assertEquals(
                "https://images.igdb.com/igdb/image/upload/t_thumb/logo.jpg",
                game.getLogoUrl()
        );
        assertEquals(
                "https://images.igdb.com/igdb/image/upload/t_cover_big/cover.jpg",
                game.getCoverUrl()
        );
    }

    @Test
    void applyIgdbAssetsRejectsSteamAndTwitchUrls() {
        Game game = Game.builder()
                .slug("valorant")
                .gameName("Valorant")
                .build();

        GameAssetPolicy.applyIgdbAssets(
                game,
                "https://static-cdn.jtvnw.net/ttv-boxart/516575-300x400.jpg",
                "https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_hero.jpg"
        );

        assertNull(game.getLogoUrl());
        assertNull(game.getCoverUrl());
    }

    @Test
    void normalizeStoredAssetsClearsLegacyNonIgdbUrls() {
        Game game = Game.builder()
                .slug("counter-strike-2")
                .gameName("Counter-Strike 2")
                .logoUrl("https://static-cdn.jtvnw.net/ttv-boxart/32399-300x400.jpg")
                .coverUrl("https://cdn.cloudflare.steamstatic.com/steam/apps/730/library_hero.jpg")
                .build();

        GameAssetPolicy.normalizeStoredAssets(game);

        assertNull(game.getLogoUrl());
        assertNull(game.getCoverUrl());
    }

    @Test
    void resolveLogoUrlPrefersPersistedIgdbUrl() {
        assertEquals(
                "https://images.igdb.com/igdb/image/upload/t_thumb/coabc123.jpg",
                GameAssetPolicy.resolveLogoUrl(
                        "counter-strike-2",
                        "https://images.igdb.com/igdb/image/upload/t_thumb/coabc123.jpg"
                )
        );
    }

    @Test
    void resolveLogoUrlReturnsNoneWhenNoAssetExists() {
        assertEquals(
                GameAssetPolicy.LOGO_NONE,
                GameAssetPolicy.resolveLogoUrl("unknown-game", null)
        );
    }

    @Test
    void isSuitableHeroUrlRejectsTinyPinnedArtwork() {
        org.junit.jupiter.api.Assertions.assertFalse(
                GameAssetPolicy.isSuitableHeroUrl(
                        "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar667x.jpg"
                )
        );
    }

    @Test
    void isSuitableHeroUrlAcceptsLandscapeArtwork() {
        org.junit.jupiter.api.Assertions.assertTrue(
                GameAssetPolicy.isSuitableHeroUrl(
                        "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar4kon.jpg"
                )
        );
    }

    @Test
    void isSuitableHeroUrlRejectsBoxArtImageId() {
        org.junit.jupiter.api.Assertions.assertFalse(
                GameAssetPolicy.isSuitableHeroUrl(
                        "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/cocaa5.jpg"
                )
        );
    }

    @Test
    void isSuitableHeroUrlRejectsNonArtworkImageId() {
        org.junit.jupiter.api.Assertions.assertFalse(
                GameAssetPolicy.isSuitableHeroUrl(
                        "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/hjnzngnrtwr82jzmmkef.jpg"
                )
        );
    }

    @Test
    void isSuitableHeroUrlRejectsGameplayScreenshot() {
        org.junit.jupiter.api.Assertions.assertFalse(
                GameAssetPolicy.isSuitableHeroUrl(
                        "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc10f95.jpg"
                )
        );
    }

    @Test
    void resolveCoverUrlReturnsNullWhenNoAssetExists() {
        assertNull(GameAssetPolicy.resolveCoverUrl("unknown-game", null));
    }
}
