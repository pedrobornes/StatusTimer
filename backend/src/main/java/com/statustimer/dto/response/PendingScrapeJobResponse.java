package com.statustimer.dto.response;

import com.statustimer.entity.ScrapeJobType;

public record PendingScrapeJobResponse(
        Long id,
        String slug,
        ScrapeJobType jobType,
        Integer priority,
        Integer steamAppId,
        String gameName
) {}
