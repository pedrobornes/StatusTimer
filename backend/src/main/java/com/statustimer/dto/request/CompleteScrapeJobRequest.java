package com.statustimer.dto.request;

import com.statustimer.entity.ScrapeJobStatus;

public record CompleteScrapeJobRequest(
        ScrapeJobStatus status,
        String failureReason
) {
    public CompleteScrapeJobRequest(ScrapeJobStatus status) {
        this(status, null);
    }
}
