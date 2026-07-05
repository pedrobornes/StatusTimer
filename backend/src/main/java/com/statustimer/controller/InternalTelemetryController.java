package com.statustimer.controller;

import com.statustimer.dto.request.SyncTelemetryRequest;
import com.statustimer.dto.response.SyncTelemetryResponse;
import com.statustimer.service.GameTelemetryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal")
@RequiredArgsConstructor
public class InternalTelemetryController {

    private final GameTelemetryService gameTelemetryService;

    @PostMapping({"/status/sync", "/telemetry/update"})
    public SyncTelemetryResponse syncTelemetry(@RequestBody SyncTelemetryRequest request) {
        return gameTelemetryService.syncTelemetry(request);
    }
}
