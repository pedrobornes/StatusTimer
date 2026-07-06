package com.statustimer.dto.response;

import java.util.List;

public record HarvestWorkloadResponse(
        List<HarvestWorkTargetResponse> telemetryDue,
        List<HarvestWorkTargetResponse> metricsDue,
        List<HarvestWorkTargetResponse> newsDue
) {}
