package com.statustimer.dto.request;

import com.statustimer.entity.GameGenre;
import java.util.List;

public record GameReleasePayload(
        String gameName,
        String slug,
        GameGenre genre,
        List<PlatformReleasePayload> platforms,
        Long hypeCount,
        String imageUrl,
        String logoUrl,
        Long igdbGameId,
        Integer userRating,
        Integer criticRating,
        List<String> screenshotUrls,
        List<String> trailerVideoIds
) {
}
