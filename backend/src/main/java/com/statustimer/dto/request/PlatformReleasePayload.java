package com.statustimer.dto.request;

import com.statustimer.entity.GamePlatform;
import java.time.LocalDate;

public record PlatformReleasePayload(
        GamePlatform platform,
        LocalDate releaseDate
) {
}
