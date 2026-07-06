package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.statustimer.entity.TrackedGame;
import org.junit.jupiter.api.Test;

class GameAssetPolicyTest {

    @Test
    void appliesVerifiedSteamAssets() {
        TrackedGame game = TrackedGame.builder()
                .slug("meccha-chameleon")
                .steamAppId(4704690)
                .build();

        GameAssetPolicy.applySteamAssets(
                game,
                "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/capsule.jpg",
                "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/header.jpg",
                "https://example.com/twitch-cover.jpg"
        );

        assertEquals(
                "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/capsule.jpg",
                game.getLogoUrl()
        );
        assertEquals(
                "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/4704690/header.jpg",
                game.getCoverUrl()
        );
    }

    @Test
    void resolvesLocalAssetsForValorant() {
        TrackedGame game = TrackedGame.builder()
                .slug("valorant")
                .build();

        GameAssetPolicy.applyTo(game, "https://example.com/twitch-cover.jpg");

        assertEquals("/images/logos/valorant.png", game.getLogoUrl());
        assertEquals("/images/covers/valorant.jpg", game.getCoverUrl());
    }

    @Test
    void resolvesLocalAssetsForOverwatch() {
        TrackedGame game = TrackedGame.builder()
                .slug("overwatch-2")
                .build();

        GameAssetPolicy.applyTo(game, "https://example.com/twitch-cover.jpg");

        assertEquals("/images/logos/overwatch-2.jpg", game.getLogoUrl());
        assertEquals("/images/covers/overwatch-2.png", game.getCoverUrl());
    }

    @Test
    void resolvesLocalAssetsForFortnite() {
        TrackedGame game = TrackedGame.builder()
                .slug("fortnite")
                .build();

        GameAssetPolicy.applyTo(game, "https://example.com/twitch-cover.jpg");

        assertEquals("/images/logos/fortnite.png", game.getLogoUrl());
        assertEquals("/images/covers/fortnite.png", game.getCoverUrl());
    }

    @Test
    void resolvesFallbackLogoAsNone() {
        TrackedGame game = TrackedGame.builder()
                .slug("roblox")
                .build();

        GameAssetPolicy.applyTo(game, "https://example.com/twitch-cover.jpg");

        assertEquals("none", game.getLogoUrl());
        assertEquals("https://example.com/twitch-cover.jpg", game.getCoverUrl());
    }

    @Test
    void resolvesSteamLogoFromAppIdWhenPersistedLogoMissing() {
        assertEquals(
                "https://cdn.cloudflare.steamstatic.com/steam/apps/730/logo.png",
                GameAssetPolicy.resolveLogoUrl("counter-strike-2", 730, null)
        );
    }

    @Test
    void resolvesLocalLogoWhenPersistedValueIsNone() {
        assertEquals(
                "/images/logos/gta-vi.png",
                GameAssetPolicy.resolveLogoUrl("gta-vi", null, "none")
        );
    }
}
