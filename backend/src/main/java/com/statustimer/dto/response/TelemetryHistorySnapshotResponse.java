package com.statustimer.dto.response;

import com.statustimer.entity.GameTelemetryHistory;
import java.time.LocalDateTime;

public record TelemetryHistorySnapshotResponse(
        LocalDateTime timestamp,
        String status,
        String dataSource
) {

    public static TelemetryHistorySnapshotResponse fromEntity(GameTelemetryHistory entity) {
        return new TelemetryHistorySnapshotResponse(
                entity.getCheckedAt(),
                entity.getStatus().name(),
                entity.getDataSource().name()
        );
    }
}
