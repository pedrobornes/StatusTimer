package com.statustimer.controller;

import com.statustimer.dto.request.CompleteScrapeJobRequest;
import com.statustimer.dto.response.PendingScrapeJobResponse;
import com.statustimer.service.ScrapeJobService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/scrape-jobs")
@RequiredArgsConstructor
public class InternalScrapeJobController {

    private final ScrapeJobService scrapeJobService;

    @GetMapping("/pending")
    public List<PendingScrapeJobResponse> claimPendingJobs(
            @RequestParam(name = "limit", defaultValue = "10") int limit
    ) {
        return scrapeJobService.claimPendingJobs(limit);
    }

    @PostMapping("/{id}/complete")
    public void completeJob(
            @PathVariable Long id,
            @RequestBody CompleteScrapeJobRequest request
    ) {
        scrapeJobService.completeJob(id, request.status());
    }
}
