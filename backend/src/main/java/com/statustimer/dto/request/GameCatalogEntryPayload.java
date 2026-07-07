package com.statustimer.dto.request;

import java.util.List;

public record GameCatalogEntryPayload(
        String slug,
        String gameName,
        Integer steamAppId,
        String logoUrl,
        String coverUrl,
        String twitchGameId,
        Integer twitchRank,
        Long livePlayers,
        Long twitchViewers,
        Boolean featured,
        Long igdbGameId,
        String genreName,
        Integer userRating,
        Integer criticRating,
        List<String> screenshotUrls,
        List<String> trailerVideoIds
) {
}
