package com.statustimer.config;

import com.statustimer.entity.TrackedGame;
import java.util.Map;
import java.util.Set;

public final class GameAssetPolicy {

    public static final String LOGO_NONE = "none";
    public static final Set<String> LOCAL_LOGO_SLUGS = Set.of(
            "valorant",
            "fortnite",
            "gta-vi",
            "league-of-legends",
            "minecraft",
            "overwatch-2"
    );

    private static final String STEAM_LOGO_TEMPLATE =
            "https://cdn.cloudflare.steamstatic.com/steam/apps/%d/logo.png";
    private static final String STEAM_LIBRARY_HERO_TEMPLATE =
            "https://cdn.cloudflare.steamstatic.com/steam/apps/%d/library_hero.jpg";

    private static final String LOCAL_LOGO_TEMPLATE = "/images/logos/%s.png";
    private static final String LOCAL_COVER_TEMPLATE = "/images/covers/%s.jpg";

    private static final Map<String, String> LOCAL_LOGO_OVERRIDES = Map.of(
            "overwatch-2", "/images/logos/overwatch-2.jpg"
    );

    private static final Map<String, String> LOCAL_COVER_OVERRIDES = Map.of(
            "overwatch-2", "/images/covers/overwatch-2.png",
            "fortnite", "/images/covers/fortnite.png"
    );

    private GameAssetPolicy() {
    }

    public static void applySteamAssets(
            TrackedGame game,
            String logoUrl,
            String coverUrl,
            String twitchCoverUrl
    ) {
        String resolvedLogo = hasText(logoUrl)
                ? logoUrl.trim()
                : steamLogoUrl(game.getSteamAppId());
        String resolvedCover = hasText(coverUrl)
                ? coverUrl.trim()
                : steamLibraryHeroUrl(game.getSteamAppId());

        game.setLogoUrl(hasText(resolvedLogo) ? resolvedLogo : LOGO_NONE);
        game.setCoverUrl(
                hasText(resolvedCover) ? resolvedCover : normalizeOptionalUrl(twitchCoverUrl)
        );
    }

    public static void applyTo(TrackedGame game, String twitchCoverUrl) {
        String slug = game.getSlug();

        if (LOCAL_LOGO_SLUGS.contains(slug)) {
            game.setLogoUrl(localLogoUrl(slug));
            game.setCoverUrl(resolveLocalCoverUrl(slug, twitchCoverUrl));
            return;
        }

        game.setLogoUrl(LOGO_NONE);
        game.setCoverUrl(normalizeOptionalUrl(twitchCoverUrl));
    }

    public static String resolveLogoUrl(String slug, Integer steamAppId, String persistedLogoUrl) {
        if (hasText(persistedLogoUrl)) {
            return persistedLogoUrl.trim();
        }

        if (LOCAL_LOGO_SLUGS.contains(slug)) {
            return localLogoUrl(slug);
        }

        return steamLogoUrl(steamAppId);
    }

    public static String steamLogoUrl(Integer steamAppId) {
        if (steamAppId == null || steamAppId <= 0) {
            return LOGO_NONE;
        }

        return STEAM_LOGO_TEMPLATE.formatted(steamAppId);
    }

    public static String steamLibraryHeroUrl(Integer steamAppId) {
        if (steamAppId == null || steamAppId <= 0) {
            return null;
        }

        return STEAM_LIBRARY_HERO_TEMPLATE.formatted(steamAppId);
    }

    public static boolean isRenderableLogo(String url) {
        return hasText(url);
    }

    public static String resolveCoverUrl(String slug, String persistedCoverUrl, String twitchCoverUrl) {
        if (hasText(persistedCoverUrl)) {
            return persistedCoverUrl.trim();
        }

        if (LOCAL_LOGO_SLUGS.contains(slug)) {
            return resolveLocalCoverUrl(slug, twitchCoverUrl);
        }

        return normalizeOptionalUrl(twitchCoverUrl);
    }

    private static String localLogoUrl(String slug) {
        return LOCAL_LOGO_OVERRIDES.getOrDefault(slug, LOCAL_LOGO_TEMPLATE.formatted(slug));
    }

    private static String resolveLocalCoverUrl(String slug, String twitchCoverUrl) {
        String override = LOCAL_COVER_OVERRIDES.get(slug);
        if (override != null) {
            return override;
        }

        return LOCAL_COVER_TEMPLATE.formatted(slug);
    }

    private static String normalizeOptionalUrl(String url) {
        if (!hasText(url)) {
            return null;
        }

        return url.trim();
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank() && !LOGO_NONE.equalsIgnoreCase(value.trim());
    }
}
