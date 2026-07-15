package com.statustimer.controller;

import com.statustimer.dto.request.ReconcileTwitchRanksRequest;
import com.statustimer.dto.request.SyncGameCatalogRequest;
import com.statustimer.dto.request.SyncGamesRequest;
import com.statustimer.dto.response.ReconcileTwitchRanksResponse;
import com.statustimer.dto.response.SyncGameCatalogResponse;
import com.statustimer.dto.response.SyncGamesResponse;
import com.statustimer.service.GameCatalogService;
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
    private final GameCatalogService gameCatalogService;

    @PostMapping("/sync")
    public SyncGamesResponse syncGames(@RequestBody SyncGamesRequest request) {
        return gameSyncService.syncGames(request);
    }

    @PostMapping("/catalog/sync")
    public SyncGameCatalogResponse syncCatalog(@RequestBody SyncGameCatalogRequest request) {
        return gameCatalogService.syncCatalog(request);
    }

    @PostMapping("/catalog/reconcile-twitch-ranks")
    public ReconcileTwitchRanksResponse reconcileTwitchRanks(
            @RequestBody ReconcileTwitchRanksRequest request
    ) {
        return gameCatalogService.reconcileTwitchRanks(request);
    }
}
