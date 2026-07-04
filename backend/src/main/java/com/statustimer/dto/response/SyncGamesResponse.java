package com.statustimer.dto.response;

public record SyncGamesResponse(
        int created,
        int updated,
        int total
) {
}
