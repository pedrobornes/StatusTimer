package com.statustimer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "indexability")
public record IndexabilityProperties(
        int monitoringAgeHours,
        int freshnessHoursTier1,
        int freshnessHoursTier2,
        int freshnessHoursTier3,
        long guardianIntervalMs,
        int apiOutageGraceHours
) {
    public static final String STALE_REASON_API_OUTAGE = "API_OUTAGE";
    public static final String STALE_REASON_STALE_TELEMETRY = "STALE_TELEMETRY";

    public IndexabilityProperties {
        if (monitoringAgeHours <= 0) {
            monitoringAgeHours = 48;
        }
        if (freshnessHoursTier1 <= 0) {
            freshnessHoursTier1 = 24;
        }
        if (freshnessHoursTier2 <= 0) {
            freshnessHoursTier2 = 48;
        }
        if (freshnessHoursTier3 <= 0) {
            freshnessHoursTier3 = 72;
        }
        if (guardianIntervalMs <= 0) {
            guardianIntervalMs = 900_000L;
        }
        if (apiOutageGraceHours <= 0) {
            apiOutageGraceHours = 1;
        }
    }

    public int freshnessHoursForTier(int scrapeTier) {
        return switch (scrapeTier) {
            case 1 -> freshnessHoursTier1;
            case 2 -> freshnessHoursTier2;
            default -> freshnessHoursTier3;
        };
    }
}
