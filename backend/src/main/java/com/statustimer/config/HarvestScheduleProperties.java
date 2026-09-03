package com.statustimer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "harvest.schedule")
public record HarvestScheduleProperties(
        int maxTelemetryPerCycle,
        int maxMetricsPerCycle,
        int maxCatalogMetricsPerCycle,
        int maxNewsPerCycle,
        int maxCatalogNewsPerCycle,
        int catalogMetricsFreshnessMinutes,
        int catalogNewsFreshnessMinutes,
        int telemetryMinutesTier1,
        int telemetryMinutesTier2,
        int telemetryMinutesTier3,
        int metricsMinutesTier1,
        int metricsMinutesTier2,
        int metricsMinutesTier3,
        int newsMinutesTier1,
        int newsMinutesTier2,
        int newsMinutesTier3,
        int failedRetryMinutes
) {
    public HarvestScheduleProperties {
        if (maxTelemetryPerCycle <= 0) {
            maxTelemetryPerCycle = 50;
        }
        if (maxMetricsPerCycle <= 0) {
            maxMetricsPerCycle = 50;
        }
        if (maxCatalogMetricsPerCycle <= 0) {
            maxCatalogMetricsPerCycle = 25;
        }
        if (catalogMetricsFreshnessMinutes <= 0) {
            catalogMetricsFreshnessMinutes = 60;
        }
        if (maxNewsPerCycle <= 0) {
            maxNewsPerCycle = 30;
        }
        if (maxCatalogNewsPerCycle <= 0) {
            maxCatalogNewsPerCycle = 15;
        }
        if (catalogNewsFreshnessMinutes <= 0) {
            catalogNewsFreshnessMinutes = 360;
        }
        if (telemetryMinutesTier1 <= 0) {
            telemetryMinutesTier1 = 10;
        }
        if (telemetryMinutesTier2 <= 0) {
            telemetryMinutesTier2 = 60;
        }
        if (telemetryMinutesTier3 <= 0) {
            telemetryMinutesTier3 = 300;
        }
        if (metricsMinutesTier1 <= 0) {
            metricsMinutesTier1 = 15;
        }
        if (metricsMinutesTier2 <= 0) {
            metricsMinutesTier2 = 60;
        }
        if (metricsMinutesTier3 <= 0) {
            metricsMinutesTier3 = 720;
        }
        if (newsMinutesTier1 <= 0) {
            newsMinutesTier1 = 360;
        }
        if (newsMinutesTier2 <= 0) {
            newsMinutesTier2 = 1440;
        }
        if (newsMinutesTier3 <= 0) {
            newsMinutesTier3 = 7200;
        }
        if (failedRetryMinutes <= 0) {
            failedRetryMinutes = 5;
        }
    }

    public int telemetryMinutesForTier(int scrapeTier) {
        return switch (scrapeTier) {
            case 1 -> telemetryMinutesTier1;
            case 2 -> telemetryMinutesTier2;
            default -> telemetryMinutesTier3;
        };
    }

    public int metricsMinutesForTier(int scrapeTier) {
        return switch (scrapeTier) {
            case 1 -> metricsMinutesTier1;
            case 2 -> metricsMinutesTier2;
            default -> metricsMinutesTier3;
        };
    }

    public int newsMinutesForTier(int scrapeTier) {
        return switch (scrapeTier) {
            case 1 -> newsMinutesTier1;
            case 2 -> newsMinutesTier2;
            default -> newsMinutesTier3;
        };
    }
}
