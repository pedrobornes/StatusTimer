package com.statustimer.util;

import com.statustimer.entity.Game;
import java.util.List;

public final class IgdbMetadataSupport {

    private IgdbMetadataSupport() {
    }

    public static void applyToGame(
            Game game,
            Long igdbGameId,
            Integer userRating,
            Integer criticRating,
            List<String> screenshotUrls,
            List<String> trailerVideoIds
    ) {
        if (igdbGameId != null && igdbGameId > 0) {
            game.setIgdbGameId(igdbGameId);
        }

        if (userRating != null) {
            game.setUserRating(clampRating(userRating));
        }

        if (criticRating != null) {
            game.setCriticRating(clampRating(criticRating));
        }

        if (screenshotUrls != null && !screenshotUrls.isEmpty()) {
            game.setScreenshotUrls(List.copyOf(screenshotUrls));
        }

        if (trailerVideoIds != null && !trailerVideoIds.isEmpty()) {
            game.setTrailerVideoIds(List.copyOf(trailerVideoIds));
        }
    }

    public static void applyGenreName(Game game, String genreName) {
        if (genreName != null && !genreName.isBlank()) {
            game.setGenreName(genreName.trim());
        }
    }

    private static Integer clampRating(Integer rating) {
        if (rating == null) {
            return null;
        }

        return Math.max(0, Math.min(100, rating));
    }
}
