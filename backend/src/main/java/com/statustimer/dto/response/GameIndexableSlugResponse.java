package com.statustimer.dto.response;

import java.time.LocalDateTime;

public record GameIndexableSlugResponse(
        String slug,
        LocalDateTime lastModified,
        boolean isIndexable
) {}
