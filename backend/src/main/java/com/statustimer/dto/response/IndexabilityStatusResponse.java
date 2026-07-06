package com.statustimer.dto.response;

public record IndexabilityStatusResponse(
        String slug,
        boolean indexable,
        boolean telemetryFresh,
        boolean hasProbeSignal,
        boolean hasLiveMetrics,
        boolean monitoringAgeMet,
        boolean contentReady,
        String staleReason
) {}
