package com.statustimer.dto.response;

public record SyncGameCatalogResponse(
        int created,
        int updated,
        int skipped,
        int total
) {
}
