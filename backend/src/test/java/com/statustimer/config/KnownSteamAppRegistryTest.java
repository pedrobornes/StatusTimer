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
    void returnsEmptyForUnknownSlug() {
        assertTrue(registry.resolveAppId("minecraft").isEmpty());
    }
}
