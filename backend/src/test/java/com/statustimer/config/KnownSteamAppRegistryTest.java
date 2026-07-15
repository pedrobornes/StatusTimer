package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class KnownSteamAppRegistryTest {

    private final KnownSteamAppRegistry registry = new KnownSteamAppRegistry();

    @Test
    void resolvesMechaChameleonVariants() {
        assertEquals(4704690, registry.resolveAppId("mecha-chameleon").orElseThrow());
        assertEquals(4704690, registry.resolveAppId("meccha-chameleon").orElseThrow());
    }

    @Test
    void resolvesCallOfDutyWarzone() {
        assertEquals(1962663, registry.resolveAppId("call-of-duty-warzone").orElseThrow());
    }

    @Test
    void resolvesArmaReforger() {
        assertEquals(1874880, registry.resolveAppId("arma-reforger").orElseThrow());
    }

    @Test
    void resolvesSeaOfThieves() {
        assertEquals(1172620, registry.resolveAppId("sea-of-thieves").orElseThrow());
    }

    @Test
    void resolvesResidentEvilVillage() {
        assertEquals(1196590, registry.resolveAppId("resident-evil-village").orElseThrow());
    }

    @Test
    void returnsEmptyForUnknownSlug() {
        assertTrue(registry.resolveAppId("minecraft").isEmpty());
    }
}
