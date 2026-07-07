package com.statustimer.config;

import com.statustimer.entity.Game;
import java.util.Locale;

public final class GameAssetPolicy {

    public static final String LOGO_NONE = "none";
    private static final String IGDB_IMAGE_HOST = "images.igdb.com";

    private GameAssetPolicy() {
    }

    public static void applyIgdbAssets(
            Game game,
            String logoUrl,
            String coverUrl
    ) {
        String sanitizedLogo = sanitizeImageUrl(logoUrl);
        if (sanitizedLogo != null) {
            game.setLogoUrl(sanitizedLogo);
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
        return !isIgdbImageUrl(game.getLogoUrl()) || !isIgdbImageUrl(game.getCoverUrl());
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
