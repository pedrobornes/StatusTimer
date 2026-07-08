package com.statustimer.dto.response;

public record GameCatalogSearchResponse(
        Long id,
        String slug,
        String gameName,
        String logoUrl,
        String coverUrl,
        Integer steamAppId,
        Integer userRating,
        Integer criticRating,
        String genreName,
        Long livePlayers,
        Long twitchViewers
) {
}
