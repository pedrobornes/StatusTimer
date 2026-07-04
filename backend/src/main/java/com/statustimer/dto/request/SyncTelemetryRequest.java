package com.statustimer.dto.request;

import java.util.List;

public record SyncTelemetryRequest(
        List<GameTelemetryPayload> entries
) {
}
