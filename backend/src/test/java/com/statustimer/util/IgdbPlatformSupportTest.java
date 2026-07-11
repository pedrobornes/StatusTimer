package com.statustimer.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import org.junit.jupiter.api.Test;

class IgdbPlatformSupportTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void acceptsPcOnly() {
        ArrayNode platforms = objectMapper.createArrayNode();
        platforms.add(6);

        assertTrue(IgdbPlatformSupport.hasSupportedPlatform(platforms));
    }

    @Test
    void acceptsSwitchPlusPc() {
        ArrayNode platforms = objectMapper.createArrayNode();
        platforms.add(130);
        platforms.add(6);

        assertTrue(IgdbPlatformSupport.hasSupportedPlatform(platforms));
    }

    @Test
    void rejectsSwitchOnly() {
        ArrayNode platforms = objectMapper.createArrayNode();
        platforms.add(130);

        assertFalse(IgdbPlatformSupport.hasSupportedPlatform(platforms));
    }

    @Test
    void rejectsGameBoyOnly() {
        ArrayNode platforms = objectMapper.createArrayNode();
        platforms.add(33);

        assertFalse(IgdbPlatformSupport.hasSupportedPlatform(platforms));
        assertFalse(IgdbPlatformSupport.isEligibleForDiscovery(platforms));
    }

    @Test
    void acceptsMissingPlatformsForDiscovery() {
        assertTrue(IgdbPlatformSupport.isEligibleForDiscovery(null));
        assertTrue(IgdbPlatformSupport.isEligibleForDiscovery(objectMapper.createArrayNode()));
    }

    @Test
    void rejectsEmptyPlatformsForStrictCheck() {
        assertFalse(IgdbPlatformSupport.hasSupportedPlatform(null));
        assertFalse(IgdbPlatformSupport.hasSupportedPlatform(objectMapper.createArrayNode()));
    }
}
