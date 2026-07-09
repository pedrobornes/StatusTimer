package com.statustimer.config;

import com.statustimer.entity.Game;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class GameAssetPolicy {

    public static final String LOGO_NONE = "none";
    private static final String IGDB_IMAGE_HOST = "images.igdb.com";
    private static final int HERO_MIN_WIDTH = 1920;
    private static final int HERO_MIN_HEIGHT = 720;
    private static final Pattern IGDB_IMAGE_ID_PATTERN = Pattern.compile(
            "/t_[^/]+/([^/.]+)\\.jpg",
            Pattern.CASE_INSENSITIVE
    );
    private static final Set<String> BLOCKED_HERO_IMAGE_IDS = Set.of(
            // 256x256 logo artwork previously pinned for GTA V.
            "ar667x"
    );

    private GameAssetPolicy() {
    }

    public static void applyIgdbAssets(
            Game game,
            String logoUrl,
            String coverUrl
    ) {
        String sanitizedLogo = sanitizeImageUrl(logoUrl);
        if (sanitizedLogo != null) {
            String currentLogo = sanitizeImageUrl(game.getLogoUrl());
            if (currentLogo == null
                    || !isSuitableHeroUrl(currentLogo)
                    || isSuitableHeroUrl(sanitizedLogo)) {
                game.setLogoUrl(sanitizedLogo);
            }
        }

        String sanitizedCover = sanitizeImageUrl(coverUrl);
        if (sanitizedCover != null) {
            game.setCoverUrl(sanitizedCover);
        }
    }

    public static void normalizeStoredAssets(Game game) {
        if (!isIgdbImageUrl(game.getLogoUrl())) {
            game.setLogoUrl(null);
        }

        if (!isIgdbImageUrl(game.getCoverUrl())) {
            game.setCoverUrl(null);
        }
    }

    public static boolean isIgdbImageUrl(String url) {
        return sanitizeImageUrl(url) != null;
    }

    public static String sanitizeImageUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        String trimmed = url.trim();
        if (LOGO_NONE.equalsIgnoreCase(trimmed)) {
            return null;
        }

        if (!trimmed.toLowerCase(Locale.ROOT).contains(IGDB_IMAGE_HOST)) {
            return null;
        }

        return trimmed;
    }

    public static boolean needsIgdbAssets(Game game) {
        return !isSuitableHeroUrl(game.getLogoUrl())
                || !isIgdbImageUrl(game.getCoverUrl());
    }

    public static boolean isSuitableHeroUrl(String url) {
        String sanitized = sanitizeImageUrl(url);
        if (sanitized == null) {
            return false;
        }

        if (isVerticalCoverAsset(sanitized)) {
            return false;
        }

        String imageId = extractIgdbImageId(sanitized);
        if (imageId != null && BLOCKED_HERO_IMAGE_IDS.contains(imageId)) {
            return false;
        }

        if (imageId != null && isBoxArtImageId(imageId)) {
            return false;
        }

        if (imageId != null && !isArtworkImageId(imageId)) {
            return false;
        }

        return !isGameplayScreenshotHero(sanitized);
    }

    public static boolean isArtworkImageId(String imageId) {
        return imageId != null
                && imageId.toLowerCase(Locale.ROOT).startsWith("ar");
    }

    public static boolean isBoxArtImageId(String imageId) {
        return imageId != null
                && imageId.toLowerCase(Locale.ROOT).startsWith("co");
    }

    public static boolean isGameplayScreenshotHero(String url) {
        String imageId = extractIgdbImageId(url);
        return imageId != null && imageId.toLowerCase(Locale.ROOT).startsWith("sc");
    }

    public static String extractIgdbImageId(String url) {
        String sanitized = sanitizeImageUrl(url);
        if (sanitized == null) {
            return null;
        }

        Matcher matcher = IGDB_IMAGE_ID_PATTERN.matcher(sanitized);
        if (!matcher.find()) {
            return null;
        }

        return matcher.group(1);
    }

    public static boolean meetsHeroDimensionThreshold(int width, int height) {
        return width >= HERO_MIN_WIDTH && height >= HERO_MIN_HEIGHT && width > height;
    }

    public static boolean isVerticalCoverAsset(String url) {
        String sanitized = sanitizeImageUrl(url);
        if (sanitized == null) {
            return false;
        }

        String lower = sanitized.toLowerCase(Locale.ROOT);
        return lower.contains("/t_cover") || lower.contains("/t_thumb");
    }

    public static String resolveLogoUrl(String slug, String persistedLogoUrl) {
        String sanitized = sanitizeImageUrl(persistedLogoUrl);
        if (sanitized != null) {
            return sanitized;
        }

        return LOGO_NONE;
    }

    public static boolean isRenderableLogo(String url) {
        return sanitizeImageUrl(url) != null;
    }

    public static String resolveCoverUrl(String slug, String persistedCoverUrl) {
        return sanitizeImageUrl(persistedCoverUrl);
    }

}
