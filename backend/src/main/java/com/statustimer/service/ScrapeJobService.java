package com.statustimer.service;

import com.statustimer.dto.response.PendingScrapeJobResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.ScrapeJob;
import com.statustimer.entity.ScrapeJobStatus;
import com.statustimer.entity.ScrapeJobType;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.ScrapeJobRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ScrapeJobService {

    public static final int ON_DEMAND_PRIORITY = 100;

    private final ScrapeJobRepository scrapeJobRepository;
    private final GameRepository gameRepository;

    @Transactional
    public boolean enqueueFullJob(String slug) {
        if (slug == null || slug.isBlank()) {
            return false;
        }

        String dedupeKey = buildDedupeKey(slug, ScrapeJobType.FULL);
        LocalDateTime now = LocalDateTime.now();

        return scrapeJobRepository.findByDedupeKey(dedupeKey)
                .map(existing -> requeueIfNeeded(existing, now))
                .orElseGet(() -> {
                    scrapeJobRepository.save(ScrapeJob.builder()
                            .slug(slug)
                            .jobType(ScrapeJobType.FULL)
                            .priority(ON_DEMAND_PRIORITY)
                            .status(ScrapeJobStatus.PENDING)
                            .createdAt(now)
                            .dedupeKey(dedupeKey)
                            .build());
                    return true;
                });
    }

    @Transactional
    public List<PendingScrapeJobResponse> claimPendingJobs(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        List<ScrapeJob> pending = scrapeJobRepository.findByStatusOrderByPriorityDescCreatedAtAsc(
                ScrapeJobStatus.PENDING,
                PageRequest.of(0, safeLimit)
        );

        for (ScrapeJob job : pending) {
            job.setStatus(ScrapeJobStatus.RUNNING);
        }

        return pending.stream()
                .map(this::toPendingResponse)
                .toList();
    }

    @Transactional
    public void completeJob(Long jobId, ScrapeJobStatus status) {
        ScrapeJob job = scrapeJobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Scrape job not found: " + jobId
                ));

        if (status != ScrapeJobStatus.DONE && status != ScrapeJobStatus.FAILED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Completion status must be DONE or FAILED"
            );
        }

        job.setStatus(status);
        scrapeJobRepository.save(job);
    }

    @Transactional
    public void completeRunningJobsForSlug(String slug, ScrapeJobStatus status) {
        List<ScrapeJob> runningJobs = scrapeJobRepository.findBySlugAndStatus(slug, ScrapeJobStatus.RUNNING);
        for (ScrapeJob job : runningJobs) {
            job.setStatus(status);
        }
    }

    private boolean requeueIfNeeded(ScrapeJob existing, LocalDateTime now) {
        if (existing.getStatus() == ScrapeJobStatus.PENDING
                || existing.getStatus() == ScrapeJobStatus.RUNNING) {
            return false;
        }

        existing.setStatus(ScrapeJobStatus.PENDING);
        existing.setPriority(ON_DEMAND_PRIORITY);
        existing.setCreatedAt(now);
        scrapeJobRepository.save(existing);
        return true;
    }

    private PendingScrapeJobResponse toPendingResponse(ScrapeJob job) {
        Game game = gameRepository.findBySlug(job.getSlug()).orElse(null);

        return new PendingScrapeJobResponse(
                job.getId(),
                job.getSlug(),
                job.getJobType(),
                job.getPriority(),
                game != null ? game.getSteamAppId() : null,
                game != null ? game.getGameName() : job.getSlug()
        );
    }

    private String buildDedupeKey(String slug, ScrapeJobType jobType) {
        return slug + ":" + jobType.name();
    }
}
