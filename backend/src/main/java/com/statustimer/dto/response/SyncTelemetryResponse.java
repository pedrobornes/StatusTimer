package com.statustimer.dto.response;

public record SyncTelemetryResponse(
        int created,
        int updated,
        int total
) {
}
