package com.statustimer.dto.response;

public record GameCatalogSearchResponse(
        String slug,
        String gameName,
        String logoUrl,
        Integer steamAppId
) {
}
