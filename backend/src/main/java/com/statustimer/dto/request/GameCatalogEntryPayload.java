package com.statustimer.dto.request;

import java.util.List;
import java.util.Map;
import java.time.LocalDate;

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
        LocalDate igdbFirstReleaseDate,
        String genreName,
        List<String> genreNames,
        Integer userRating,
        Integer criticRating,
        List<String> screenshotUrls,
        List<String> trailerVideoIds,
        String youtubeChannelUrl,
        Map<String, String> externalLinks,
        String steamShortDescription,
        Integer steamPriceFinal,
        String steamCurrency,
        Boolean steamWindows,
        Boolean steamMac,
        Boolean steamLinux,
        Boolean steamFreeToPlay
) {
}
