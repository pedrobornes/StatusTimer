package com.statustimer.controller;

import com.statustimer.dto.response.LifecycleStatsResponse;
import com.statustimer.service.LifecycleMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/lifecycle")
@RequiredArgsConstructor
public class InternalLifecycleController {

    private final LifecycleMonitorService lifecycleMonitorService;

    @GetMapping("/stats")
    public LifecycleStatsResponse getStats() {
        return lifecycleMonitorService.getStats();
    }
}
