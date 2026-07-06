package com.statustimer.dto.request;

import com.statustimer.entity.ScrapeJobStatus;

public record CompleteScrapeJobRequest(
        ScrapeJobStatus status
) {}
