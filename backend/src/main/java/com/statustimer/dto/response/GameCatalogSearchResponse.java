package com.statustimer.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

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
        List<String> genreNames,
        Long livePlayers,
        Long twitchViewers,
        Boolean upcomingRelease,
        LocalDateTime releaseDate
) {
}
