package com.statustimer.config;

import java.util.Set;

/**
 * Twitch directory categories and slugs that are not monitorable live-service games.
 */
public final class CatalogTwitchNoiseRegistry {

    public static final Set<String> NON_GAME_NAMES = Set.of(
            "just chatting",
            "irl",
            "art",
            "music",
            "asmr",
            "slots",
            "talk shows & podcasts",
            "pools, hot tubs, and beaches",
            "sports",
            "special events",
            "software and game development",
            "games + demos",
            "games done quick",
            "animals, aquariums,and zoos",
            "animals, aquariums, and zoos",
            "american idol",
            "tabletop rpgs",
            "virtual casino",
            "poker",
            "qsmp",
            "food & drink",
            "im only sleeping",
            "i'm only sleeping",
            "bombanana!",
            "wallpaper engine",
            "co-working & studying",
            "co-working and studying",
            "crypto",
            "streamer university",
            "la velada",
            "la velada del año",
            "kings league",
            "king's league",
            "мир танков"
    );

    public static final Set<String> QUARANTINED_SLUGS = Set.of(
            "games-demos",
            "games-done-quick",
            "animals-aquariums-and-zoos",
            "just-chatting",
            "irl",
            "art",
            "music",
            "asmr",
            "slots",
            "talk-shows-and-podcasts",
            "pools-hot-tubs-and-beaches",
            "sports",
            "special-events",
            "software-and-game-development",
            "american-idol",
            "tabletop-rpgs",
            "virtual-casino",
            "poker",
            "qsmp",
            "food-and-drink",
            "im-only-sleeping",
            "bombanana",
            "wallpaper-engine",
            "co-working-and-studying",
            "crypto",
            "streamer-university",
            "la-velada",
            "la-velada-del-ano",
            "kings-league",
            "mir-tankov"
    );

    private CatalogTwitchNoiseRegistry() {
    }
}
