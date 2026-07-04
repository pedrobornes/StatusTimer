package com.statustimer.dto.response;

import com.statustimer.entity.UpcomingRelease;
import java.time.LocalDateTime;

public record UpcomingReleaseResponse(
        Long id,
        String gameName,
        LocalDateTime releaseDate,
        Long hypeCount
) {

    public static UpcomingReleaseResponse fromEntity(UpcomingRelease entity) {
        return new UpcomingReleaseResponse(
                entity.getId(),
                entity.getGameName(),
                entity.getReleaseDate(),
                entity.getHypeCount()
        );
    }
}
