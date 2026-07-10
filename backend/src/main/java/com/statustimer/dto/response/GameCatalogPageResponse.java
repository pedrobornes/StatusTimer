package com.statustimer.dto.response;

import java.util.List;

public record GameCatalogPageResponse(
        List<GameTelemetryResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
