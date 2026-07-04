package com.statustimer.dto.response;

import com.statustimer.entity.GameTelemetry;
import java.time.LocalDateTime;

public record GameTelemetryResponse(
        Long id,
        String gameSlug,
        String status,
        Integer latencyMs,
        String dataSource,
        LocalDateTime lastChecked
) {

    public static GameTelemetryResponse fromEntity(GameTelemetry entity) {
        return new GameTelemetryResponse(
                entity.getId(),
                entity.getGameSlug(),
                entity.getStatus().name(),
                entity.getLatencyMs(),
                entity.getDataSource().name(),
                entity.getLastChecked()
        );
    }
}
