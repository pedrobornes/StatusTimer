package com.statustimer.config;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import java.util.Locale;
import java.util.Set;

/**
 * Identifies Twitch directory categories and other non-game catalog noise that should
 * not appear in the public catalog or trigger IGDB enrichment.
 */
public final class CatalogNoisePolicy {

    private static final Set<String> TWITCH_NON_GAME_NAMES = Set.of(
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
            "animals, aquariums,and zoos",
            "animals, aquariums, and zoos",
            "american idol"
    );

    private static final Set<String> QUARANTINED_SLUGS = Set.of(
            "games-demos",
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
            "american-idol"
    );

    private CatalogNoisePolicy() {
    }

    public static boolean isTwitchCategoryNoise(Game game) {
        if (game == null) {
            return false;
        }

        return isTwitchCategoryNoise(game.getSlug(), game.getGameName());
    }

    public static boolean isTwitchCategoryNoise(String slug, String gameName) {
        if (slug != null && QUARANTINED_SLUGS.contains(slug.trim().toLowerCase(Locale.ROOT))) {
            return true;
        }

        if (gameName == null || gameName.isBlank()) {
            return false;
        }

        return TWITCH_NON_GAME_NAMES.contains(normalizeName(gameName));
    }

    public static boolean isQuarantined(Game game) {
        if (game == null || game.getStaleReason() == null) {
            return false;
        }

        String staleReason = game.getStaleReason();
        return IndexabilityProperties.STALE_REASON_TWITCH_CATEGORY.equals(staleReason)
                || IndexabilityProperties.STALE_REASON_PROTECTED_TITLE_SPINOFF.equals(staleReason)
                || IndexabilityProperties.STALE_REASON_EXCLUDED_CATALOG_PROFILE.equals(staleReason);
    }

    public static boolean isProtectedTitleSpinoff(Game game) {
        return game != null && ManualProtectedCatalogPolicy.isProtectedTitleSpinoff(game.getSlug());
    }

    public static boolean shouldSkipCatalogSurfacing(Game game) {
        return isQuarantined(game)
                || isTwitchCategoryNoise(game)
                || isProtectedTitleSpinoff(game)
                || CatalogMatureContentPolicy.shouldSkipCatalogSurfacing(game);
    }

    /**
     * Marks known Twitch category noise so it stays out of SEO and catalog listings.
     *
     * @return true when the game is quarantined (already or newly)
     */
    public static boolean applyQuarantineIfNoise(Game game) {
        if (game == null) {
            return false;
        }

        if (!isTwitchCategoryNoise(game) && !isQuarantined(game)) {
            return false;
        }

        if (isTwitchCategoryNoise(game)) {
            game.setStaleReason(IndexabilityProperties.STALE_REASON_TWITCH_CATEGORY);
            game.setIsIndexable(false);
            if (game.getLifecycleState() == null) {
                game.setLifecycleState(LifecycleState.CATALOG);
            }
        }

        return true;
    }

    /**
     * Marks IGDB spinoffs of manually protected tier-1 titles so they stay out of search and SEO.
     *
     * @return true when the game is quarantined (already or newly)
     */
    public static boolean applyQuarantineIfProtectedTitleSpinoff(Game game) {
        if (game == null) {
            return false;
        }

        if (!ManualProtectedCatalogPolicy.isProtectedTitleSpinoff(game.getSlug())) {
            return false;
        }

        game.setStaleReason(IndexabilityProperties.STALE_REASON_PROTECTED_TITLE_SPINOFF);
        game.setIsIndexable(false);
        if (game.getLifecycleState() == null) {
            game.setLifecycleState(LifecycleState.CATALOG);
        }

        return true;
    }

    private static String normalizeName(String gameName) {
        return gameName.trim().toLowerCase(Locale.ROOT);
    }
}
