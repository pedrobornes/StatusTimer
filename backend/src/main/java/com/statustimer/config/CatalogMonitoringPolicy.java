package com.statustimer.config;

import com.statustimer.entity.Game;
import com.statustimer.entity.GameType;
import java.util.Set;

/**
 * Distinguishes full server monitoring from catalog profiles (IGDB + Twitch metrics only).
 */
public final class CatalogMonitoringPolicy {

    private static final Set<String> SERVER_PROBE_SLUGS = Set.of(
            "counter-strike-2",
            "valorant",
            "dota-2",
            "pubg",
            "fortnite",
            "league-of-legends",
            "teamfight-tactics",
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
            "elden-ring",
            "dead-by-daylight",
            "world-of-warcraft"
    );

    private CatalogMonitoringPolicy() {
    }

    public static boolean supportsServerProbe(String slug, Integer steamAppId) {
        if (slug != null && SERVER_PROBE_SLUGS.contains(slug)) {
            return true;
        }

        return steamAppId != null && steamAppId > 0;
    }

    public static boolean supportsServerProbe(Game game) {
        if (game == null) {
            return false;
        }

        if (game.getGameType() == GameType.SINGLE_PLAYER) {
            return false;
        }

        return supportsServerProbe(game.getSlug(), game.getSteamAppId());
    }

    public static boolean isCatalogOnlyProfile(Game game) {
        if (game == null) {
            return false;
        }

        return !supportsServerProbe(game);
    }
}
