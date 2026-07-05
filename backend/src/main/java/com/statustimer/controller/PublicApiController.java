package com.statustimer.controller;

import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.dto.response.GameStatusDetailResponse;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.dto.response.ServerStatusResponse;
import com.statustimer.dto.response.TelemetryHistorySnapshotResponse;
import com.statustimer.dto.response.TelemetryIncidentResponse;
import com.statustimer.dto.response.UpcomingReleaseResponse;
import com.statustimer.service.GameCatalogService;
import com.statustimer.service.GameStatusService;
import com.statustimer.service.GameTelemetryService;
import com.statustimer.service.GamingNewsService;
import com.statustimer.service.ServerStatusService;
import com.statustimer.service.UpcomingReleaseService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PublicApiController {

    private final ServerStatusService serverStatusService;
    private final GameCatalogService gameCatalogService;
    private final GameTelemetryService gameTelemetryService;
    private final GameStatusService gameStatusService;
    private final GamingNewsService gamingNewsService;
    private final UpcomingReleaseService upcomingReleaseService;

    @GetMapping("/status")
    public List<ServerStatusResponse> getServerStatuses() {
        return serverStatusService.findAll();
    }

    @GetMapping("/status/{slug}")
    public GameStatusDetailResponse getGameStatusDetail(@PathVariable String slug) {
        return gameStatusService.findByGameSlug(slug);
    }

    @GetMapping("/telemetry")
    public List<GameTelemetryResponse> getGameTelemetry(
            @RequestParam(name = "featured", defaultValue = "false") boolean featured
    ) {
        return featured ? gameTelemetryService.findAllFeatured() : gameTelemetryService.findAll();
    }

    @GetMapping("/telemetry/dashboard")
    public List<GameTelemetryResponse> getDashboardTelemetry(
            @RequestParam(name = "limit", defaultValue = "6") int limit
    ) {
        return gameTelemetryService.findDashboardTopGames(limit);
    }

    @GetMapping("/games/search")
    public List<GameCatalogSearchResponse> searchGames(@RequestParam("q") String query) {
        List<GameCatalogSearchResponse> results = gameCatalogService.search(query);
        for (GameCatalogSearchResponse result : results) {
            gameTelemetryService.ensureTelemetryStub(result.slug());
        }
        return results;
    }

    @GetMapping("/telemetry/history")
    public List<TelemetryHistorySnapshotResponse> getTelemetryHistory(@RequestParam("game") String game) {
        return gameTelemetryService.findHistoryByGameSlug(game);
    }

    @GetMapping("/telemetry/incidents")
    public List<TelemetryIncidentResponse> getTelemetryIncidents() {
        return gameTelemetryService.findRecentIncidents();
    }

    @GetMapping("/telemetry/{slug}")
    public GameTelemetryResponse getGameTelemetryBySlug(@PathVariable String slug) {
        return gameTelemetryService.findByGameSlug(slug);
    }

    @GetMapping("/news")
    public List<GamingNewsResponse> getGamingNews() {
        return gamingNewsService.findLatest();
    }

    @GetMapping("/releases")
    public List<UpcomingReleaseResponse> getUpcomingReleases() {
        return upcomingReleaseService.findAll();
    }

    @PostMapping("/releases/{id}/hype")
    public UpcomingReleaseResponse incrementHype(@PathVariable Long id) {
        return upcomingReleaseService.incrementHype(id);
    }
}
