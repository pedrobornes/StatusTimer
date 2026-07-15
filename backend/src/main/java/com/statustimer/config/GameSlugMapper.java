package com.statustimer.config;

import com.statustimer.util.SlugUtils;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GameSlugMapper {

    private static final Map<String, String> TWITCH_TO_STEAM_SLUGS = Map.ofEntries(
            Map.entry("pubg-battlegrounds", "pubg"),
            Map.entry("apex-legends-1", "apex-legends"),
            Map.entry("counter-strike", "counter-strike-2")
    );

    private static final Map<String, String> SLUG_ALIASES = Map.of(
            "mecha-chameleon", "meccha-chameleon",
            "counter-strike", "counter-strike-2",
            // GTA V variants collapse into the IGDB slug.
            "gta-v", "grand-theft-auto-v",
            "grand-theft-auto-v-legacy", "grand-theft-auto-v",
            "grand-theft-auto-v-enhanced", "grand-theft-auto-v",
            // Overwatch 2 is represented as IGDB slug "overwatch--1" but we expose "overwatch" in the app.
            "overwatch-2", "overwatch",
            "overwatch--1", "overwatch"
    );

    public String resolveCanonicalSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return slug;
        }

        String normalized = SlugUtils.normalizeCatalogSlug(slug);
        return SLUG_ALIASES.getOrDefault(normalized, normalized);
    }

    public boolean isCanonicalCatalogSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return false;
        }

        return slug.equals(getSteamSlug(slug));
    }

    public Map<String, String> slugAliases() {
        return SLUG_ALIASES;
    }

    public String getSteamSlug(String twitchSlug) {
        if (twitchSlug == null || twitchSlug.isBlank()) {
            return twitchSlug;
        }

        String canonicalSlug = resolveCanonicalSlug(twitchSlug);
        return TWITCH_TO_STEAM_SLUGS.getOrDefault(canonicalSlug, canonicalSlug);
    }

    public List<String> blockedCatalogListingSlugs() {
        List<String> blocked = new ArrayList<>();
        blocked.addAll(SLUG_ALIASES.keySet());
        blocked.addAll(TWITCH_TO_STEAM_SLUGS.keySet());
        return Collections.unmodifiableList(blocked);
    }
}
