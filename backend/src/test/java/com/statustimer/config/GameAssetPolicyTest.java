package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.statustimer.entity.TrackedGame;
import org.junit.jupiter.api.Test;

class GameAssetPolicyTest {

    @Test
    void applyIgdbAssetsPersistsLogoAndCoverUrls() {
        TrackedGame game = TrackedGame.builder()
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
        TrackedGame game = TrackedGame.builder()
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
        TrackedGame game = TrackedGame.builder()
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
    void resolveCoverUrlReturnsNullWhenNoAssetExists() {
        assertNull(GameAssetPolicy.resolveCoverUrl("unknown-game", null));
    }
}
