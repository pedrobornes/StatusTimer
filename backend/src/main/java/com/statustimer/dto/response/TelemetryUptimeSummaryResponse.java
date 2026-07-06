package com.statustimer.dto.response;

public record TelemetryUptimeSummaryResponse(
        Integer uptime7dPercent,
        Integer uptime30dPercent
) {}
