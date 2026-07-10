package com.statustimer.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Lightweight catalog row for list/grid views. Omits media arrays and other
 * fields that are only needed on detail pages.
 */
public record CatalogGameListItemResponse(
        Long id,
        String gameSlug,
        String gameName,
        String status,
        Integer latencyMs,
        String dataSource,
        LocalDateTime lastChecked,
        String logoUrl,
        String coverUrl,
        Boolean isUpcoming,
        LocalDate releaseDate,
        Integer twitchRank,
        LocalDate steamReleaseDate,
        Boolean steamAdultContent,
        Long livePlayers,
        Long twitchViewers,
        Integer userRating,
        Integer criticRating,
        String genreName,
        List<String> genreNames
) {

    public static CatalogGameListItemResponse fromTelemetryResponse(GameTelemetryResponse source) {
        return new CatalogGameListItemResponse(
                source.id(),
                source.gameSlug(),
                source.gameName(),
                source.status(),
                source.latencyMs(),
                source.dataSource(),
                source.lastChecked(),
                source.logoUrl(),
                source.coverUrl(),
                source.isUpcoming(),
                source.releaseDate(),
                source.twitchRank(),
                source.steamReleaseDate(),
                source.steamAdultContent(),
                source.livePlayers(),
                source.twitchViewers(),
                source.userRating(),
                source.criticRating(),
                source.genreName(),
                source.genreNames()
        );
    }
}
