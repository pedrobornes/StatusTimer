package com.statustimer.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.util.concurrent.TimeUnit;
import org.springframework.stereotype.Component;

@Component
public class SteamMetadataRefreshPolicy {

    private static final int REFRESH_INTERVAL_HOURS = 24;

    private final Cache<String, Boolean> recentRefreshes = Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(REFRESH_INTERVAL_HOURS, TimeUnit.HOURS)
            .build();

    public boolean shouldRefreshOnVisit(String slug) {
        if (slug == null || slug.isBlank()) {
            return false;
        }
        return recentRefreshes.getIfPresent(slug) == null;
    }

    public void markRefreshed(String slug) {
        if (slug == null || slug.isBlank()) {
            return;
        }
        recentRefreshes.put(slug, Boolean.TRUE);
    }
}
