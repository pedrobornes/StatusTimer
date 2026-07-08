package com.statustimer.util;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;

/**
 * IGDB platform allowlist for catalog discovery. A title is eligible when at least
 * one supported platform is present (e.g. Switch + PC is OK because PC is included).
 */
public final class IgdbPlatformSupport {

    private static final Set<Integer> SUPPORTED_PLATFORM_IDS = Set.of(
            6,   // PC (Microsoft Windows)
            14,  // Mac
            49,  // Xbox One
            167, // PlayStation 5
            169  // Xbox Series X|S
    );

    private IgdbPlatformSupport() {
    }

    public static boolean hasSupportedPlatform(JsonNode platformIds) {
        if (platformIds == null || !platformIds.isArray() || platformIds.isEmpty()) {
            return false;
        }

        for (JsonNode platformId : platformIds) {
            if (platformId.canConvertToInt()
                    && SUPPORTED_PLATFORM_IDS.contains(platformId.asInt())) {
                return true;
            }
        }

        return false;
    }
}
