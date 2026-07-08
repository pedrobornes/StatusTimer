package com.statustimer.dto.response;

import java.util.Map;

public record HarvestWorkTargetResponse(
        String slug,
        String gameName,
        Integer steamAppId,
        String twitchGameId,
        Integer scrapeTier,
        Map<String, String> externalLinks
) {}
