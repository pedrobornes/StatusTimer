package com.statustimer.config;

import com.statustimer.entity.Game;
import java.util.Map;
import java.util.Set;

/**
 * Guards Steam app id assignment for titles that are not sold on Steam or collide
 * with spin-off listings (e.g. Minecraft vs Minecraft Legends on Steam).
 */
public final class SteamAppIdPolicy {

    private static final Set<String> NON_STEAM_PLAYER_TRACKING_SLUGS = Set.of(
            "minecraft",
            "roblox",
            "fortnite",
            "valorant",
            "league-of-legends"
    );

    private static final Map<String, Set<Integer>> BLOCKED_APP_IDS_BY_SLUG = Map.of(
            "minecraft", Set.of(1928870)
    );

    private SteamAppIdPolicy() {
    }

    public static boolean suppressesSteamPlayerTracking(String slug) {
        return slug != null && NON_STEAM_PLAYER_TRACKING_SLUGS.contains(slug);
    }

    public static boolean isBlockedSteamAppId(String slug, Integer steamAppId) {
        if (PinnedGamePolicy.isBlockedSteamAppId(slug, steamAppId)) {
            return true;
        }

        if (slug == null || steamAppId == null) {
            return false;
        }

        return BLOCKED_APP_IDS_BY_SLUG.getOrDefault(slug, Set.of()).contains(steamAppId);
    }

    public static boolean mayAssignSteamAppId(String slug, Integer steamAppId) {
        if (steamAppId == null || steamAppId <= 0) {
            return false;
        }

        if (suppressesSteamPlayerTracking(slug)) {
            return false;
        }

        return !isBlockedSteamAppId(slug, steamAppId);
    }

    public static void sanitize(Game game) {
        if (game == null) {
            return;
        }

        String slug = game.getSlug();
        if (!suppressesSteamPlayerTracking(slug) && !isBlockedSteamAppId(slug, game.getSteamAppId())) {
            return;
        }

        game.setSteamAppId(null);
        game.setLivePlayers(null);
    }
}
