package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.statustimer.entity.Game;
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
    void monitoredNonSteamTitleSupportsServerProbe() {
        assertTrue(CatalogMonitoringPolicy.supportsServerProbe("valorant", null));
    }
}
