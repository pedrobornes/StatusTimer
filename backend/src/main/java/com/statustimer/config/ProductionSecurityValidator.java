package com.statustimer.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("prod")
@RequiredArgsConstructor
public class ProductionSecurityValidator {

    private static final String LOCAL_DEFAULT_API_KEY = "your-local-secret-key";
    private static final int MIN_API_KEY_LENGTH = 32;

    private final AppSecurityProperties appSecurityProperties;

    @PostConstruct
    void validateApiKey() {
        String apiKey = appSecurityProperties.apiKey();

        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("APP_API_KEY must be set in production");
        }

        if (LOCAL_DEFAULT_API_KEY.equals(apiKey)) {
            throw new IllegalStateException("APP_API_KEY must not use the local development default in production");
        }

        if (apiKey.length() < MIN_API_KEY_LENGTH) {
            throw new IllegalStateException(
                    "APP_API_KEY must be at least " + MIN_API_KEY_LENGTH + " characters in production"
            );
        }
    }
}
