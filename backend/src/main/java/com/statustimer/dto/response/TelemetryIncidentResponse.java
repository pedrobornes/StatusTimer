package com.statustimer.dto.response;

import com.statustimer.entity.GameTelemetryHistory;
import java.time.LocalDateTime;

public record TelemetryIncidentResponse(
        String gameSlug,
        String status,
        String dataSource,
        LocalDateTime publishedAt
) {

    public static TelemetryIncidentResponse fromEntity(GameTelemetryHistory entity) {
        return new TelemetryIncidentResponse(
                entity.getGameSlug(),
                entity.getStatus().name(),
                entity.getDataSource().name(),
                entity.getCheckedAt()
        );
    }
}
