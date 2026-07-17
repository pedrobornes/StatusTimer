package com.statustimer.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class GameSlugMapperTest {

    private final GameSlugMapper mapper = new GameSlugMapper();

    @Test
    void resolvesCanonicalSlugAliases() {
        assertEquals("meccha-chameleon", mapper.resolveCanonicalSlug("mecha-chameleon"));
        assertEquals("counter-strike-2", mapper.resolveCanonicalSlug("counter-strike"));
        assertEquals("control-resonant", mapper.resolveCanonicalSlug("control-resonant-1"));
        assertEquals("control-resonant", mapper.resolveCanonicalSlug("control-resonant--1"));
        assertEquals("guild-wars-3", mapper.resolveCanonicalSlug("guild-wars-3-1"));
        assertEquals("guild-wars-3", mapper.resolveCanonicalSlug("guild-wars-3--1"));
        assertEquals("minecraft", mapper.resolveCanonicalSlug("minecraft"));
    }

    @Test
    void normalizesTrademarkAndRomanNumeralSlugVariants() {
        assertEquals("apex-legends", mapper.resolveCanonicalSlug("apex-legends-tm"));
        assertEquals("slay-the-spire-2", mapper.resolveCanonicalSlug("slay-the-spire-ii"));
        assertEquals("diablo-4", mapper.resolveCanonicalSlug("diablo-iv"));
    }

    @Test
    void identifiesCanonicalCatalogSlugs() {
        assertEquals(true, mapper.isCanonicalCatalogSlug("apex-legends"));
        assertEquals(false, mapper.isCanonicalCatalogSlug("apex-legends-tm"));
        assertEquals(false, mapper.isCanonicalCatalogSlug("counter-strike"));
        assertEquals(true, mapper.isCanonicalCatalogSlug("counter-strike-2"));
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
