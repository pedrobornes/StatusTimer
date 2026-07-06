package com.statustimer.controller;

import com.statustimer.dto.request.ApiOutageReportRequest;
import com.statustimer.dto.request.CompleteHarvestWorkRequest;
import com.statustimer.dto.response.HarvestWorkloadResponse;
import com.statustimer.service.FreshnessGuardianService;
import com.statustimer.service.HarvestScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/harvest")
@RequiredArgsConstructor
public class InternalHarvestController {

    private final HarvestScheduleService harvestScheduleService;
    private final FreshnessGuardianService freshnessGuardianService;

    @GetMapping("/workload")
    public HarvestWorkloadResponse getWorkload() {
        return harvestScheduleService.getDueWorkload();
    }

    @PostMapping("/complete")
    public void completeWork(@RequestBody CompleteHarvestWorkRequest request) {
        harvestScheduleService.completeWork(request);
    }

    @PostMapping("/outage")
    public void reportApiOutage(@RequestBody ApiOutageReportRequest request) {
        freshnessGuardianService.reportApiOutage(request.domain(), request.active());
    }
}
