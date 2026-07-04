package com.statustimer.controller;

import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.dto.response.ServerStatusResponse;
import com.statustimer.dto.response.UpcomingReleaseResponse;
import com.statustimer.service.GamingNewsService;
import com.statustimer.service.ServerStatusService;
import com.statustimer.service.UpcomingReleaseService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class PublicApiController {

    private final ServerStatusService serverStatusService;
    private final GamingNewsService gamingNewsService;
    private final UpcomingReleaseService upcomingReleaseService;

    @GetMapping("/status")
    public List<ServerStatusResponse> getServerStatuses() {
        return serverStatusService.findAll();
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
