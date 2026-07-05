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
        List<PlatformReleaseResponse> platforms
) {

    public static UpcomingReleaseResponse fromEntity(Game entity) {
        return new UpcomingReleaseResponse(
                entity.getId(),
                entity.getGameName(),
                entity.getSlug(),
                entity.getGenre().getLabel(),
                entity.resolvePrimaryReleaseDate(),
                entity.getHypeCount(),
                entity.getImageUrl(),
                entity.getPlatforms().stream()
                        .map(PlatformReleaseResponse::fromEntity)
                        .toList()
        );
    }
}
