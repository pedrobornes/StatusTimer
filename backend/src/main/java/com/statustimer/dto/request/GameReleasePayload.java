package com.statustimer.dto.request;

import java.util.List;

public record GameReleasePayload(
        String gameName,
        String slug,
        List<String> genreNames,
        List<PlatformReleasePayload> platforms,
        Long hypeCount,
        String imageUrl,
        String logoUrl,
        Long igdbGameId,
        Integer userRating,
        Integer criticRating,
        List<String> screenshotUrls,
        List<String> trailerVideoIds,
        Integer steamAppId
) {
}
