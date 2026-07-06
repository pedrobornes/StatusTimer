package com.statustimer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "telemetry.rollup")
public record TelemetryRollupProperties(
        int retentionDays,
        int minimumSamples
) {

    public TelemetryRollupProperties {
        if (retentionDays <= 0) {
            retentionDays = 90;
        }
        if (minimumSamples <= 0) {
            minimumSamples = 5;
        }
    }
}
