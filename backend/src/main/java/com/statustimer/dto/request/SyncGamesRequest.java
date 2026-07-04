package com.statustimer.dto.request;

import java.util.List;

public record SyncGamesRequest(
        List<GameReleasePayload> releases
) {
}
