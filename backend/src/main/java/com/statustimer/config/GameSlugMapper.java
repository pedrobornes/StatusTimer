package com.statustimer.config;

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
            "mecha-chameleon", "meccha-chameleon"
    );

    public String resolveCanonicalSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return slug;
        }

        return SLUG_ALIASES.getOrDefault(slug, slug);
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
}
