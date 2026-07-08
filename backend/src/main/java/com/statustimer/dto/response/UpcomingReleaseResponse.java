package com.statustimer.dto.response;

import com.statustimer.entity.Game;
import java.time.LocalDateTime;
import java.util.List;

public record UpcomingReleaseResponse(
        Long id,
        String gameName,
        String slug,
        String genre,
        LocalDateTime releaseDate,
        Long hypeCount,
        String imageUrl,
        String logoUrl,
        Long igdbGameId,
        Integer userRating,
        Integer criticRating,
        List<String> screenshotUrls,
        List<String> trailerVideoIds,
        List<PlatformReleaseResponse> platforms,
        Integer steamAppId
) {

    public static UpcomingReleaseResponse fromEntity(Game entity) {
        return new UpcomingReleaseResponse(
                entity.getId(),
                entity.getGameName(),
                entity.getSlug(),
                entity.getGenre().getLabel(),
                entity.resolvePrimaryReleaseDate(),
                entity.getHypeCount(),
                resolveReleaseImageUrl(entity),
                entity.getLogoUrl(),
                entity.getIgdbGameId(),
                entity.getUserRating(),
                entity.getCriticRating(),
                List.copyOf(entity.getScreenshotUrls()),
                List.copyOf(entity.getTrailerVideoIds()),
                entity.getPlatforms().stream()
                        .map(PlatformReleaseResponse::fromEntity)
                        .toList(),
                entity.getSteamAppId()
        );
    }

    private static String resolveReleaseImageUrl(Game entity) {
        String coverUrl = com.statustimer.config.GameAssetPolicy.sanitizeImageUrl(entity.getCoverUrl());
        if (coverUrl != null) {
            return coverUrl;
        }

        return com.statustimer.config.GameAssetPolicy.sanitizeImageUrl(entity.getImageUrl());
    }
}
