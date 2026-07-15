package com.statustimer.config;

import com.statustimer.service.FreshnessGuardianService;
import com.statustimer.service.LifecycleMonitorService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FreshnessGuardianScheduler {

    private final FreshnessGuardianService freshnessGuardianService;
    private final LifecycleMonitorService lifecycleMonitorService;

    @Scheduled(fixedDelayString = "${indexability.guardian-interval-ms:900000}")
    public void evaluateIndexableFreshness() {
        freshnessGuardianService.runGuardianCycle();
        lifecycleMonitorService.runMonitorCycle();
    }
}
