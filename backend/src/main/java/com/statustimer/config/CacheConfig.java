package com.statustimer.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.util.List;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableCaching
public class CacheConfig {

    public static final String INDEXABLE_SLUGS_CACHE = "indexableSlugs";
    public static final String PUBLIC_READ_SHORT_CACHE = "publicReadShort";
    public static final String PUBLIC_READ_MEDIUM_CACHE = "publicReadMedium";

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager manager = new SimpleCacheManager();
        manager.setCaches(List.of(
                buildCache(INDEXABLE_SLUGS_CACHE, Duration.ofHours(1), 1),
                buildCache(PUBLIC_READ_SHORT_CACHE, Duration.ofSeconds(60), 64),
                buildCache(PUBLIC_READ_MEDIUM_CACHE, Duration.ofSeconds(120), 32)
        ));
        return manager;
    }

    private static Cache buildCache(String name, Duration ttl, long maxSize) {
        return new CaffeineCache(
                name,
                Caffeine.newBuilder()
                        .expireAfterWrite(ttl)
                        .maximumSize(maxSize)
                        .build()
        );
    }
}
