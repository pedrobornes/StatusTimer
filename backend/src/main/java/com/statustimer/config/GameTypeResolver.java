package com.statustimer.config;

import com.statustimer.entity.GameType;
import java.util.Collection;
import java.util.Set;

/**
 * Derives whether a title is primarily single-player or multiplayer from Steam categories.
 */
public final class GameTypeResolver {

    private static final int STEAM_SINGLE_PLAYER_CATEGORY_ID = 2;

    private static final Set<Integer> STEAM_MULTIPLAYER_CATEGORY_IDS = Set.of(
            1,   // Multi-player
            9,   // Co-op
            27,  // Cross-Platform Multiplayer
            36,  // Online Multi-Player
            37,  // Local Multi-Player
            38,  // Shared/Split Screen Co-op
            39,  // Shared/Split Screen
            49   // PvP
    );

    private static final Set<String> MULTIPLAYER_ONLY_SLUGS = Set.of(
            "counter-strike-2",
            "valorant",
            "dota-2",
            "pubg",
            "fortnite",
            "league-of-legends",
            "minecraft",
            "roblox",
            "apex-legends",
            "call-of-duty",
            "grand-theft-auto-v",
            "overwatch",
            "rainbow-six-siege",
            "rocket-league",
            "destiny-2",
            "rust",
            "dead-by-daylight",
            "world-of-warcraft"
    );

    private GameTypeResolver() {
    }

    public static GameType resolveFromSteamCategoryIds(Collection<Integer> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return null;
        }

        boolean hasMultiplayer = categoryIds.stream()
                .anyMatch(STEAM_MULTIPLAYER_CATEGORY_IDS::contains);
        if (hasMultiplayer) {
            return GameType.MULTIPLAYER;
        }

        boolean hasSinglePlayer = categoryIds.contains(STEAM_SINGLE_PLAYER_CATEGORY_ID);
        if (hasSinglePlayer) {
            return GameType.SINGLE_PLAYER;
        }

        return null;
    }

    public static GameType resolvePinnedSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }

        if (MULTIPLAYER_ONLY_SLUGS.contains(slug)) {
            return GameType.MULTIPLAYER;
        }

        return null;
    }
}
