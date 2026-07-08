package com.statustimer.dto.response;

public record GameActivationResponse(
        String slug,
        boolean promoted,
        boolean telemetryReady,
        boolean jobQueued,
        boolean catalogOnly
) {}
