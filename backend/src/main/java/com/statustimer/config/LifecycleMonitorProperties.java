package com.statustimer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "lifecycle.monitor")
public record LifecycleMonitorProperties(
        int maxMonitoredGames,
        int demoteInactivityDays,
        int promoteMaxPerCycle
) {
    public LifecycleMonitorProperties {
        if (maxMonitoredGames <= 0) {
            maxMonitoredGames = 500;
        }
        if (demoteInactivityDays <= 0) {
            demoteInactivityDays = 30;
        }
        if (promoteMaxPerCycle <= 0) {
            promoteMaxPerCycle = 25;
        }
    }
}
