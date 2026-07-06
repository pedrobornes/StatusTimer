package com.statustimer.dto.response;

import java.util.List;

public record GameCatalogSearchResponse(
        String slug,
        String gameName,
        String logoUrl,
        String coverUrl,
        Integer steamAppId,
        Integer userRating,
        Integer criticRating,
        String genreName,
        List<String> themes
) {
}
