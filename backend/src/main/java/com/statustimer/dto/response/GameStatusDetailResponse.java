package com.statustimer.dto.response;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record GameStatusDetailResponse(
        String gameName,
        GameTelemetryResponse telemetry,
        List<TelemetryHistorySnapshotResponse> history,
        List<TelemetryIncidentResponse> incidents,
        List<GamingNewsResponse> news,
        boolean telemetryReady,
        LocalDateTime firstMonitoredAt,
        TelemetryUptimeSummaryResponse uptime,
        SteamStoreListingResponse steamStore,
        List<String> screenshotUrls,
        List<String> trailerVideoIds,
        String youtubeChannelUrl,
        Map<String, String> externalLinks,
        boolean catalogOnly
) {}
