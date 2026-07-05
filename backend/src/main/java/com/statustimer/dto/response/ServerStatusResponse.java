package com.statustimer.dto.response;

import com.statustimer.entity.ServerStatus;
import java.time.LocalDateTime;

public record ServerStatusResponse(
        Long id,
        String serviceName,
        String serviceSlug,
        String category,
        Boolean isUp,
        LocalDateTime lastChecked
) {

    public static ServerStatusResponse fromEntity(ServerStatus entity) {
        return new ServerStatusResponse(
                entity.getId(),
                entity.getServiceName(),
                entity.getServiceSlug(),
                entity.getCategory().name(),
                entity.getIsUp(),
                entity.getLastChecked()
        );
    }
}
