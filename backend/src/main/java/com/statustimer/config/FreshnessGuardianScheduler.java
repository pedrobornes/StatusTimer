package com.statustimer.config;

import com.statustimer.service.FreshnessGuardianService;
import com.statustimer.service.GamingNewsService;
import com.statustimer.service.LifecycleMonitorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class FreshnessGuardianScheduler {

    private final FreshnessGuardianService freshnessGuardianService;
    private final LifecycleMonitorService lifecycleMonitorService;
    private final GamingNewsService gamingNewsService;

    @Scheduled(fixedDelayString = "${indexability.guardian-interval-ms:900000}")
    public void evaluateIndexableFreshness() {
        freshnessGuardianService.runGuardianCycle();
        lifecycleMonitorService.runMonitorCycle();
        reconcileDuplicateNewsSafely();
    }

    private void reconcileDuplicateNewsSafely() {
        try {
            int removed = gamingNewsService.reconcileDuplicateNews();
            if (removed > 0) {
                log.info("Reconciled {} duplicate gaming news rows", removed);
            }
        } catch (RuntimeException ex) {
            log.warn("Gaming news duplicate reconciliation failed", ex);
        }
    }
}
