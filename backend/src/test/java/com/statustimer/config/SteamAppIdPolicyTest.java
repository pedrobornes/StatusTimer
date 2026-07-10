package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.entity.Game;
import org.junit.jupiter.api.Test;

class SteamAppIdPolicyTest {

    @Test
    void suppressesSteamPlayerTrackingForMinecraft() {
        assertThat(SteamAppIdPolicy.suppressesSteamPlayerTracking("minecraft")).isTrue();
        assertThat(SteamAppIdPolicy.mayAssignSteamAppId("minecraft", 1928870)).isFalse();
    }

    @Test
    void blocksMinecraftLegendsAppIdForMinecraftSlug() {
        assertThat(SteamAppIdPolicy.isBlockedSteamAppId("minecraft", 1928870)).isTrue();
    }

    @Test
    void sanitizeClearsWrongMinecraftSteamAppId() {
        Game game = Game.builder()
                .slug("minecraft")
                .gameName("Minecraft")
                .steamAppId(1928870)
                .livePlayers(16L)
                .build();

        SteamAppIdPolicy.sanitize(game);

        assertThat(game.getSteamAppId()).isNull();
        assertThat(game.getLivePlayers()).isNull();
    }
}
