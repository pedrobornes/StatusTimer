package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.statustimer.entity.Game;
import com.statustimer.entity.GameType;
import org.junit.jupiter.api.Test;

class CatalogMonitoringPolicyTest {

    @Test
    void infinityNikkiIsCatalogOnlyProfile() {
        Game game = Game.builder()
                .slug("infinity-nikki")
                .gameName("Infinity Nikki")
                .build();

        assertTrue(CatalogMonitoringPolicy.isCatalogOnlyProfile(game));
        assertFalse(CatalogMonitoringPolicy.supportsServerProbe("infinity-nikki", null));
    }

    @Test
    void infinityNikkiWithSteamAppIdSupportsServerProbe() {
        Game game = Game.builder()
                .slug("infinity-nikki")
                .gameName("Infinity Nikki")
                .steamAppId(3164330)
                .build();

        assertTrue(CatalogMonitoringPolicy.supportsServerProbe("infinity-nikki", 3164330));
        assertFalse(CatalogMonitoringPolicy.isCatalogOnlyProfile(game));
    }

    @Test
    void steamTitleSupportsServerProbe() {
        assertTrue(CatalogMonitoringPolicy.supportsServerProbe("dead-by-daylight", 381210));
        assertFalse(CatalogMonitoringPolicy.isCatalogOnlyProfile(
                Game.builder().slug("dead-by-daylight").steamAppId(381210).build()
        ));
    }

    @Test
    void riotTitlesSupportServerProbe() {
        assertTrue(CatalogMonitoringPolicy.supportsServerProbe("valorant", null));
        assertTrue(CatalogMonitoringPolicy.supportsServerProbe("league-of-legends", null));
        assertTrue(CatalogMonitoringPolicy.supportsServerProbe("teamfight-tactics", null));
        assertFalse(CatalogMonitoringPolicy.isCatalogOnlyProfile(
                Game.builder().slug("teamfight-tactics").build()
        ));
    }

    @Test
    void singlePlayerTitlesDoNotSupportServerProbe() {
        Game game = Game.builder()
                .slug("fallout-new-vegas")
                .gameName("Fallout: New Vegas")
                .steamAppId(22380)
                .gameType(GameType.SINGLE_PLAYER)
                .build();

        assertFalse(CatalogMonitoringPolicy.supportsServerProbe(game));
        assertTrue(CatalogMonitoringPolicy.isCatalogOnlyProfile(game));
    }
}
