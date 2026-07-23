package com.statustimer.util;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Set;

/**
 * IGDB platform allowlist for catalog discovery. A title is eligible when at least
 * one supported platform is present (e.g. Switch + PC is OK because PC is included).
 * Mobile-only titles are never eligible once platforms are known.
 */
public final class IgdbPlatformSupport {

    private static final Set<Integer> SUPPORTED_PLATFORM_IDS = Set.of(
            6,   // PC (Microsoft Windows)
            14,  // Mac
            48,  // PlayStation 4
            49,  // Xbox One
            167, // PlayStation 5
            169  // Xbox Series X|S
    );

    /** Common phone/tablet IGDB platform ids. */
    private static final Set<Integer> MOBILE_PLATFORM_IDS = Set.of(
            34,  // Android
            39,  // iOS
            73,  // BlackBerry OS
            74,  // Windows Phone
            407  // Windows Mobile
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

    public static boolean isMobileOnly(JsonNode platformIds) {
        if (platformIds == null || !platformIds.isArray() || platformIds.isEmpty()) {
            return false;
        }

        boolean sawAny = false;
        for (JsonNode platformId : platformIds) {
            if (!platformId.canConvertToInt()) {
                continue;
            }
            sawAny = true;
            if (!MOBILE_PLATFORM_IDS.contains(platformId.asInt())) {
                return false;
            }
        }

        return sawAny;
    }

    /**
     * IGDB text search often omits {@code platforms} even when the field is requested.
     * Accept unknown platform sets during discovery; reject when platforms are present
     * and none are on the supported allowlist (including mobile-only titles).
     */
    public static boolean isEligibleForDiscovery(JsonNode platformIds) {
        if (platformIds == null || !platformIds.isArray() || platformIds.isEmpty()) {
            return true;
        }

        if (isMobileOnly(platformIds)) {
            return false;
        }

        return hasSupportedPlatform(platformIds);
    }
}
