package com.statustimer.config;

import com.statustimer.util.SlugUtils;
import java.util.Locale;
import java.util.Set;

/**
 * Tier-1 titles whose IGDB/Twitch slug prefixes must not spawn separate catalog pages
 * (e.g. {@code fortnite-2-love-on-the-battlefield} when users search Fortnite).
 */
public final class ManualProtectedCatalogPolicy {

    public static final Set<String> SLUGS = Set.of(
            "valorant",
            "fortnite",
            "counter-strike-2"
    );

    private ManualProtectedCatalogPolicy() {
    }

    public static boolean isProtectedSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return false;
        }

        return SLUGS.contains(slug.trim().toLowerCase(Locale.ROOT));
    }

    public static boolean isProtectedTitleSpinoff(String slug) {
        if (slug == null || slug.isBlank()) {
            return false;
        }

        String normalized = slug.trim().toLowerCase(Locale.ROOT);
        for (String protectedSlug : SLUGS) {
            if (normalized.startsWith(protectedSlug + "-")) {
                return true;
            }
        }

        return false;
    }

    public static boolean isExactProtectedTitleQuery(String query) {
        if (query == null || query.isBlank()) {
            return false;
        }

        String slugQuery = SlugUtils.toSlug(query);
        return isProtectedSlug(slugQuery);
    }
}
