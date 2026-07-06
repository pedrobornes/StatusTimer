package com.statustimer.dto.response;

public record HarvestWorkTargetResponse(
        String slug,
        String gameName,
        Integer steamAppId,
        String twitchGameId,
        Integer scrapeTier
) {}
