package com.statustimer.dto.request;

import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;

public record GameTelemetryPayload(
        String gameSlug,
        TelemetryStatus status,
        Integer latencyMs,
        TelemetrySource dataSource,
        Boolean isUpcoming
) {
}
