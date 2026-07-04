package com.statustimer.controller;

import com.statustimer.dto.request.SyncGamesRequest;
import com.statustimer.dto.response.SyncGamesResponse;
import com.statustimer.service.GameSyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/games")
@RequiredArgsConstructor
public class InternalGameController {

    private final GameSyncService gameSyncService;

    @PostMapping("/sync")
    public SyncGamesResponse syncGames(@RequestBody SyncGamesRequest request) {
        return gameSyncService.syncGames(request);
    }
}
