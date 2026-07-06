package com.statustimer.service;

import com.statustimer.config.CacheConfig;
import com.statustimer.config.IndexabilityProperties;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TrackedGame;
import com.statustimer.repository.TrackedGameRepository;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FreshnessGuardianService {

    private static final Set<LifecycleState> GUARDED_LIFECYCLES = EnumSet.of(
            LifecycleState.MONITORED,
            LifecycleState.INDEXABLE
    );

    private final TrackedGameRepository trackedGameRepository;
    private final IndexabilityProperties indexabilityProperties;
    private final IndexabilityService indexabilityService;

    private volatile LocalDateTime apiOutageReportedAt;

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.INDEXABLE_SLUGS_CACHE, allEntries = true)
    public int runGuardianCycle() {
        if (isApiOutageGraceActive()) {
            log.info("Freshness guardian skipped: API outage grace period active");
            return 0;
        }

        int changed = 0;
        LocalDateTime now = LocalDateTime.now();

        for (TrackedGame game : trackedGameRepository.findAll()) {
            if (!GUARDED_LIFECYCLES.contains(game.getLifecycleState())) {
                continue;
            }

            if (!Boolean.TRUE.equals(game.getIsIndexable())) {
                continue;
            }

            if (game.getLastTelemetryAt() == null) {
                continue;
            }

            int tier = game.getScrapeTier() != null ? game.getScrapeTier() : 3;
            long hoursSinceTelemetry = ChronoUnit.HOURS.between(game.getLastTelemetryAt(), now);
            if (hoursSinceTelemetry <= indexabilityProperties.freshnessHoursForTier(tier)) {
                continue;
            }

            game.setStaleReason(IndexabilityProperties.STALE_REASON_STALE_TELEMETRY);
            game.setIsIndexable(false);
            if (game.getLifecycleState() == LifecycleState.INDEXABLE) {
                game.setLifecycleState(LifecycleState.MONITORED);
            }
            trackedGameRepository.save(game);
            changed++;
        }

        if (changed > 0) {
            log.info("Freshness guardian de-indexed {} stale games", changed);
        }

        return changed;
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.INDEXABLE_SLUGS_CACHE, allEntries = true)
    public void reportApiOutage(String domain, boolean active) {
        if (active) {
            apiOutageReportedAt = LocalDateTime.now();
            for (TrackedGame game : trackedGameRepository.findAll()) {
                if (!GUARDED_LIFECYCLES.contains(game.getLifecycleState())) {
                    continue;
                }
                game.setStaleReason(IndexabilityProperties.STALE_REASON_API_OUTAGE);
                trackedGameRepository.save(game);
            }
            log.warn("API outage reported for domain={} — SEO grace period enabled", domain);
            return;
        }

        apiOutageReportedAt = null;
        for (TrackedGame game : trackedGameRepository.findAll()) {
            if (!IndexabilityProperties.STALE_REASON_API_OUTAGE.equals(game.getStaleReason())) {
                continue;
            }
            game.setStaleReason(null);
            trackedGameRepository.save(game);
            indexabilityService.recalculateForSlug(game.getSlug());
        }
        log.info("API outage cleared for domain={}", domain);
    }

    private boolean isApiOutageGraceActive() {
        if (apiOutageReportedAt == null) {
            return false;
        }

        long hours = ChronoUnit.HOURS.between(apiOutageReportedAt, LocalDateTime.now());
        return hours < indexabilityProperties.apiOutageGraceHours();
    }
}
