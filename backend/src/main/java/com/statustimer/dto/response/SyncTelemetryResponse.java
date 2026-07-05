package com.statustimer.dto.response;

public record SyncTelemetryResponse(
        int created,
        int updated,
        int total,
        int skipped
) {
    public SyncTelemetryResponse(int created, int updated, int total) {
        this(created, updated, total, 0);
    }
}
