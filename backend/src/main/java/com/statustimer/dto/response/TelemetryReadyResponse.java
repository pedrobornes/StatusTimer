package com.statustimer.dto.response;

public record TelemetryReadyResponse(
        String slug,
        boolean ready
) {}
