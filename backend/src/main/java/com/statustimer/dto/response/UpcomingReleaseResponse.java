package com.statustimer.dto.response;

import com.statustimer.config.GameAssetPolicy;
import com.statustimer.config.PinnedGamePolicy;
import com.statustimer.entity.Game;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record UpcomingReleaseResponse(
        Long id,
        String gameName,
        String slug,
        String genre,
        List<String> genreNames,
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
        List<String> genreNames = List.copyOf(entity.getGenreNames());
        String primaryGenre = resolvePrimaryGenre(entity, genreNames);

        return new UpcomingReleaseResponse(
                entity.getId(),
                entity.getGameName(),
                entity.getSlug(),
                primaryGenre,
                genreNames,
                entity.resolveEarliestKnownReleaseDate()
                        .map(LocalDate::atStartOfDay)
                        .orElse(null),
                entity.getHypeCount(),
                resolveReleaseImageUrl(entity),
                resolveReleaseHeroUrl(entity),
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

    private static String resolvePrimaryGenre(Game entity, List<String> genreNames) {
        if (!genreNames.isEmpty()) {
            return genreNames.getFirst();
        }

        if (entity.getGenreName() != null && !entity.getGenreName().isBlank()) {
            return entity.getGenreName().trim();
        }

        return null;
    }

    private static String resolveReleaseImageUrl(Game entity) {
        String coverUrl = GameAssetPolicy.sanitizeImageUrl(entity.getCoverUrl());
        if (coverUrl != null) {
            return coverUrl;
        }

        return GameAssetPolicy.sanitizeImageUrl(entity.getImageUrl());
    }

    private static String resolveReleaseHeroUrl(Game entity) {
        String persisted = GameAssetPolicy.sanitizeImageUrl(entity.getLogoUrl());
        if (GameAssetPolicy.isSuitableHeroUrl(persisted)) {
            return persisted;
        }

        return PinnedGamePolicy.findBySlug(entity.getSlug())
                .map(PinnedGamePolicy.Pin::fallbackLogoUrl)
                .map(GameAssetPolicy::sanitizeImageUrl)
                .filter(GameAssetPolicy::isSuitableHeroUrl)
                .orElse(null);
    }
}
