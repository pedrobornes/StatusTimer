package com.statustimer.dto.request;

import com.statustimer.entity.ServerStatus;
import com.statustimer.entity.ServiceCategory;
import java.time.LocalDateTime;

public record UpsertServerStatusRequest(
        String serviceName,
        ServiceCategory category,
        Boolean isUp,
        LocalDateTime lastChecked
) {

    public ServerStatus toNewEntity() {
        return ServerStatus.builder()
                .serviceName(serviceName)
                .category(category)
                .isUp(isUp)
                .lastChecked(lastChecked)
                .build();
    }

    public void applyTo(ServerStatus existing) {
        existing.setCategory(category);
        existing.setIsUp(isUp);
        existing.setLastChecked(lastChecked);
    }
}
