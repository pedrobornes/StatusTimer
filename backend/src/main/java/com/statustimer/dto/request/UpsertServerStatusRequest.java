package com.statustimer.dto.request;

import com.statustimer.entity.ServerStatus;
import com.statustimer.entity.ServiceCategory;
import java.time.LocalDateTime;

public record UpsertServerStatusRequest(
        String serviceName,
        String serviceSlug,
        ServiceCategory category,
        Boolean isUp,
        LocalDateTime lastChecked
) {

    public ServerStatus toNewEntity() {
        return ServerStatus.builder()
                .serviceName(serviceName)
                .serviceSlug(serviceSlug)
                .category(category)
                .isUp(isUp)
                .lastChecked(lastChecked)
                .build();
    }

    public void applyTo(ServerStatus existing) {
        existing.setServiceName(serviceName);
        existing.setServiceSlug(serviceSlug);
        existing.setCategory(category);
        existing.setIsUp(isUp);
        existing.setLastChecked(lastChecked);
    }
}
