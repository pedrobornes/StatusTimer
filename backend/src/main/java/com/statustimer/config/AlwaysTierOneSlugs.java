package com.statustimer.config;

import java.util.Set;

/**
 * Star titles that must remain Tier 1 regardless of Twitch trend calculations.
 * Keep in sync with {@code ALWAYS_TIER_1} in {@code scripts/scrapers/status.py}.
 */
public final class AlwaysTierOneSlugs {

    public static final Set<String> SLUGS = Set.of(
            "counter-strike-2",
            "dota-2",
            "valorant",
            "league-of-legends",
            "apex-legends",
            "rust",
            "grand-theft-auto-v",
            "fortnite",
            "dead-by-daylight",
            "world-of-warcraft"
    );

    private AlwaysTierOneSlugs() {
    }
}
