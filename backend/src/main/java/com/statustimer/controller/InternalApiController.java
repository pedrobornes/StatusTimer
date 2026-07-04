package com.statustimer.controller;

import com.statustimer.dto.request.CreateGamingNewsRequest;
import com.statustimer.dto.request.UpsertServerStatusRequest;
import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.dto.response.ServerStatusResponse;
import com.statustimer.service.GamingNewsService;
import com.statustimer.service.ServerStatusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal")
@RequiredArgsConstructor
public class InternalApiController {

    private final ServerStatusService serverStatusService;
    private final GamingNewsService gamingNewsService;

    @PostMapping("/status")
    public ServerStatusResponse upsertServerStatus(@RequestBody UpsertServerStatusRequest request) {
        return serverStatusService.upsert(request);
    }

    @PostMapping("/news")
    @ResponseStatus(HttpStatus.CREATED)
    public GamingNewsResponse createGamingNews(@RequestBody CreateGamingNewsRequest request) {
        return gamingNewsService.create(request);
    }
}
