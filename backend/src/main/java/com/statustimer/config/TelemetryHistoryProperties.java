package com.statustimer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "telemetry.history")
public record TelemetryHistoryProperties(
        int heartbeatMinutesTier1,
        int heartbeatMinutesTier2,
        int heartbeatMinutesTier3,
        int retentionHours,
        int purgeBatchSize,
        long purgeIntervalMs
) {
    public TelemetryHistoryProperties {
        if (heartbeatMinutesTier1 <= 0) {
            heartbeatMinutesTier1 = 30;
        }
        if (heartbeatMinutesTier2 <= 0) {
            heartbeatMinutesTier2 = 60;
        }
        if (heartbeatMinutesTier3 <= 0) {
            heartbeatMinutesTier3 = 120;
        }
        if (retentionHours <= 0) {
            retentionHours = 72;
        }
        if (purgeBatchSize <= 0) {
            purgeBatchSize = 500;
        }
        if (purgeIntervalMs <= 0) {
            purgeIntervalMs = 3_600_000L;
        }
    }

    public int heartbeatMinutesForTier(int scrapeTier) {
        return switch (scrapeTier) {
            case 1 -> heartbeatMinutesTier1;
            case 2 -> heartbeatMinutesTier2;
            default -> heartbeatMinutesTier3;
        };
    }
}
