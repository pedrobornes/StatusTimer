package com.statustimer.dto.request;

import com.statustimer.entity.HarvestWorkType;
import java.util.List;

public record CompleteHarvestWorkRequest(
        List<HarvestWorkResultPayload> results
) {
    public record HarvestWorkResultPayload(
            String slug,
            HarvestWorkType workType,
            boolean success
    ) {}
}
