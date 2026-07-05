package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class GameSlugMapperTest {

    private final GameSlugMapper mapper = new GameSlugMapper();

    @Test
    void resolvesCanonicalSlugAliases() {
        assertEquals("meccha-chameleon", mapper.resolveCanonicalSlug("mecha-chameleon"));
        assertEquals("minecraft", mapper.resolveCanonicalSlug("minecraft"));
    }

    @Test
    void returnsMappedSteamSlugForKnownTwitchSlug() {
        assertEquals("pubg", mapper.getSteamSlug("pubg-battlegrounds"));
        assertEquals("apex-legends", mapper.getSteamSlug("apex-legends-1"));
        assertEquals("call-of-duty-warzone", mapper.getSteamSlug("call-of-duty-warzone"));
    }

    @Test
    void mapsTwitchCounterStrikeSlugToMonitoredTitle() {
        assertEquals("counter-strike-2", mapper.getSteamSlug("counter-strike-2"));
        assertEquals("counter-strike-2", mapper.getSteamSlug("counter-strike"));
    }

    @Test
    void returnsOriginalSlugWhenNoMappingExists() {
        assertEquals("minecraft", mapper.getSteamSlug("minecraft"));
        assertEquals("dota-2", mapper.getSteamSlug("dota-2"));
    }

    @Test
    void returnsBlankSlugUnchanged() {
        assertEquals("", mapper.getSteamSlug(""));
        assertEquals(null, mapper.getSteamSlug(null));
    }
}
