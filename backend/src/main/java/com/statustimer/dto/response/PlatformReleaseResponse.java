package com.statustimer.dto.response;

import com.statustimer.entity.GamePlatformDetail;
import java.time.LocalDate;

public record PlatformReleaseResponse(
        String platform,
        LocalDate releaseDate
) {

    public static PlatformReleaseResponse fromEntity(GamePlatformDetail entity) {
        return new PlatformReleaseResponse(
                entity.getPlatform().name(),
                entity.getReleaseDate()
        );
    }
}
