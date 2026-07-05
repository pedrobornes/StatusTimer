package com.statustimer.dto.request;

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
        Boolean featured
) {
}
