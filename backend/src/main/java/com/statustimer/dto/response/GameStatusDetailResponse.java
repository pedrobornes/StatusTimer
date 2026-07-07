package com.statustimer.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record GameStatusDetailResponse(
        GameTelemetryResponse telemetry,
        List<TelemetryHistorySnapshotResponse> history,
        List<TelemetryIncidentResponse> incidents,
        List<GamingNewsResponse> news,
        boolean telemetryReady,
        LocalDateTime firstMonitoredAt,
        TelemetryUptimeSummaryResponse uptime,
        SteamStoreListingResponse steamStore
) {}
