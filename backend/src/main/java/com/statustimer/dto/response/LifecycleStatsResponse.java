package com.statustimer.dto.response;

public record LifecycleStatsResponse(
        long catalog,
        long monitored,
        long indexable,
        long activeMonitored,
        int maxMonitoredGames,
        int demoteInactivityDays,
        int promoteMaxPerCycle
) {}
