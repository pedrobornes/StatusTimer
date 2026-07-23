package com.statustimer.config;

import com.statustimer.entity.Game;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Canonical identity overrides for games that collide with legacy catalog entries
 * (e.g. Counter-Strike 1.3 on Steam app 10 vs Counter-Strike 2 on app 730).
 */
public final class PinnedGamePolicy {

    public record Pin(
            String slug,
            String igdbSlug,
            long igdbGameId,
            int steamAppId,
            Set<Integer> blockedSteamAppIds,
            Set<String> blockedIgdbSlugs,
            String fallbackLogoUrl,
            String fallbackCoverUrl
    ) {
    }

    private static final Pin COUNTER_STRIKE_2 = new Pin(
            "counter-strike-2",
            "counter-strike-2",
            242_408L,
            730,
            Set.of(10),
            Set.of("counter-strike"),
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar4kon.jpg",
            "https://images.igdb.com/igdb/image/upload/t_cover_big/coaczd.jpg"
    );

    private static final Pin GRAND_THEFT_AUTO_V = new Pin(
            "grand-theft-auto-v",
            "grand-theft-auto-v",
            1020L,
            3240220,
            Set.of(271590),
            Set.of(),
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar4cy.jpg",
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co2lbd.jpg"
    );

    private static final Pin OVERWATCH_2 = new Pin(
            "overwatch",
            "overwatch--1",
            125_174L,
            2357570,
            Set.of(),
            Set.of("overwatch"),
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar6a9.jpg",
            "https://images.igdb.com/igdb/image/upload/t_cover_big/coc99p.jpg"
    );

    private static final Pin DEAD_BY_DAYLIGHT = new Pin(
            "dead-by-daylight",
            "dead-by-daylight",
            18866L,
            381210,
            Set.of(3453670),
            Set.of(),
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar8eh.jpg",
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co5zky.jpg"
    );

    private static final Pin PATH_OF_EXILE = new Pin(
            "path-of-exile",
            "path-of-exile",
            19_164L,
            238960,
            Set.of(2_694_490),
            Set.of("path-of-exile-2"),
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar12fj.jpg",
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg"
    );

    private static final Pin PATH_OF_EXILE_2 = new Pin(
            "path-of-exile-2",
            "path-of-exile-2",
            125_642L,
            2_694_490,
            Set.of(238960),
            Set.of("path-of-exile"),
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar37ie.jpg",
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co8ae0.jpg"
    );

    private static final Pin ALONE_IN_THE_DARK_2024 = new Pin(
            "alone-in-the-dark",
            "alone-in-the-dark--1",
            213_237L,
            1_310_410,
            // Legacy remasters / wrong franchise bindings seen in catalog pollution.
            Set.of(548_090),
            Set.of(
                    "alone-in-the-dark",
                    "alone-in-the-dark--3",
                    "alone-in-the-dark-3",
                    "alone-in-the-dark-1"
            ),
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co52t8.jpg",
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co52t8.jpg"
    );

    private static final Map<String, Pin> BY_SLUG = Map.of(
            COUNTER_STRIKE_2.slug(), COUNTER_STRIKE_2,
            GRAND_THEFT_AUTO_V.slug(), GRAND_THEFT_AUTO_V,
            OVERWATCH_2.slug(), OVERWATCH_2,
            DEAD_BY_DAYLIGHT.slug(), DEAD_BY_DAYLIGHT,
            PATH_OF_EXILE.slug(), PATH_OF_EXILE,
            PATH_OF_EXILE_2.slug(), PATH_OF_EXILE_2,
            ALONE_IN_THE_DARK_2024.slug(), ALONE_IN_THE_DARK_2024
    );

    private PinnedGamePolicy() {
    }

    public static Optional<Pin> findBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }

        return Optional.ofNullable(BY_SLUG.get(slug));
    }

    public static boolean isPinned(String slug) {
        return findBySlug(slug).isPresent();
    }

    public static boolean isBlockedSteamAppId(String slug, Integer steamAppId) {
        if (steamAppId == null) {
            return false;
        }

        return findBySlug(slug)
                .map(pin -> pin.blockedSteamAppIds().contains(steamAppId))
                .orElse(false);
    }

    public static boolean matchesIgdbGame(String slug, IgdbGameMatch match) {
        Optional<Pin> pin = findBySlug(slug);
        if (pin.isEmpty()) {
            return false;
        }

        Pin resolved = pin.get();
        String igdbSlug = match.igdbSlug() == null ? "" : match.igdbSlug().trim();
        if (!igdbSlug.isBlank() && resolved.blockedIgdbSlugs().contains(igdbSlug)) {
            return false;
        }

        if (match.steamAppId() != null && resolved.blockedSteamAppIds().contains(match.steamAppId())) {
            return false;
        }

        if (resolved.igdbSlug().equals(igdbSlug)) {
            return true;
        }

        return match.igdbId() == resolved.igdbGameId();
    }

    public static boolean needsAssetRefresh(Game game) {
        Optional<Pin> pin = findBySlug(game.getSlug());
        if (pin.isEmpty()) {
            return false;
        }

        Pin resolved = pin.get();
        if (isBlockedSteamAppId(game.getSlug(), game.getSteamAppId())) {
            return true;
        }

        if (game.getIgdbGameId() != null && game.getIgdbGameId() != resolved.igdbGameId()) {
            return true;
        }

        return !GameAssetPolicy.isRenderableLogo(game.getLogoUrl())
                || !GameAssetPolicy.isSuitableHeroUrl(game.getLogoUrl())
                || !GameAssetPolicy.isIgdbImageUrl(game.getCoverUrl());
    }

    public static void applyFallbackAssets(Game game) {
        findBySlug(game.getSlug()).ifPresent(pin -> {
            GameAssetPolicy.applyIgdbAssets(game, pin.fallbackLogoUrl(), pin.fallbackCoverUrl());
            game.setIgdbGameId(pin.igdbGameId());
            game.setSteamAppId(pin.steamAppId());
            game.setGameName(TrackedGameCatalog.resolveGameName(pin.slug()));
        });
    }
}
