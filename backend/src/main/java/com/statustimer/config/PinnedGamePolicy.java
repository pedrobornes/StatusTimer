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
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar439t.jpg",
            "https://images.igdb.com/igdb/image/upload/t_cover_big/coaczd.jpg"
    );

    private static final Map<String, Pin> BY_SLUG = Map.of(
            COUNTER_STRIKE_2.slug(), COUNTER_STRIKE_2
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
