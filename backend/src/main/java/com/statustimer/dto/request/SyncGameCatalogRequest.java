package com.statustimer.dto.request;

import java.util.List;

public record SyncGameCatalogRequest(List<GameCatalogEntryPayload> entries) {
}
