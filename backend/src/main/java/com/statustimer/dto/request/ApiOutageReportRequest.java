package com.statustimer.dto.request;

public record ApiOutageReportRequest(
        String domain,
        boolean active
) {}
