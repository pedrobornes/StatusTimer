package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.statustimer.config.IgdbProperties;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class IgdbApiClient {

    private static final String OAUTH_URL = "https://id.twitch.tv/oauth2/token";
    private static final String API_BASE = "https://api.igdb.com/v4";
    private static final long MIN_REQUEST_INTERVAL_MS = 350L;
    private static final long RATE_LIMIT_COOLDOWN_MS = 90_000L;

    private final IgdbProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    private String accessToken;
    private Instant tokenExpiresAt = Instant.EPOCH;
    private long lastRequestAtMs;
    private long rateLimitedUntilMs;

    public IgdbApiClient(IgdbProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @PostConstruct
    void logConfigurationState() {
        if (isConfigured()) {
            log.info("IGDB client configured for search and metadata enrichment");
            return;
        }

        log.warn("IGDB client is not configured; set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET in backend/.env");
    }

    public boolean isConfigured() {
        return properties.isConfigured();
    }

    public boolean isRateLimited() {
        return System.currentTimeMillis() < rateLimitedUntilMs;
    }

    public Optional<JsonNode> postGamesQuery(String body) {
        if (!isConfigured()) {
            return Optional.empty();
        }

        if (isRateLimited()) {
            log.debug("IGDB games query skipped while rate-limit cooldown is active");
            return Optional.empty();
        }

        throttleBeforeRequest();

        try {
            String token = ensureAccessToken();
            HttpRequest request = HttpRequest.newBuilder(URI.create(API_BASE + "/games"))
                    .timeout(Duration.ofSeconds(20))
                    .header("Client-ID", properties.getClientId())
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() == 429) {
                rateLimitedUntilMs = System.currentTimeMillis() + RATE_LIMIT_COOLDOWN_MS;
                log.warn(
                        "IGDB games query rate limited (HTTP 429); pausing IGDB enrichment for {}s",
                        RATE_LIMIT_COOLDOWN_MS / 1000
                );
                return Optional.empty();
            }

            if (response.statusCode() != 200) {
                log.warn(
                        "IGDB games query failed with HTTP {}: {}",
                        response.statusCode(),
                        response.body()
                );
                return Optional.empty();
            }

            return Optional.of(objectMapper.readTree(response.body()));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.warn("IGDB games query interrupted");
            return Optional.empty();
        } catch (Exception exception) {
            log.warn("IGDB games query failed", exception);
            return Optional.empty();
        }
    }

    private synchronized void throttleBeforeRequest() {
        long now = System.currentTimeMillis();
        long waitMs = MIN_REQUEST_INTERVAL_MS - (now - lastRequestAtMs);
        if (waitMs > 0) {
            try {
                Thread.sleep(waitMs);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        }
        lastRequestAtMs = System.currentTimeMillis();
    }

    private String ensureAccessToken() throws Exception {
        if (accessToken != null && Instant.now().isBefore(tokenExpiresAt)) {
            return accessToken;
        }

        String query = "client_id="
                + URLEncoder.encode(properties.getClientId(), StandardCharsets.UTF_8)
                + "&client_secret="
                + URLEncoder.encode(properties.getClientSecret(), StandardCharsets.UTF_8)
                + "&grant_type=client_credentials";

        HttpRequest request = HttpRequest.newBuilder(URI.create(OAUTH_URL))
                .timeout(Duration.ofSeconds(15))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(query))
                .build();

        HttpResponse<String> response = httpClient.send(
                request,
                HttpResponse.BodyHandlers.ofString()
        );
        response.body();

        if (response.statusCode() != 200) {
            throw new IllegalStateException("IGDB OAuth failed with HTTP " + response.statusCode());
        }

        JsonNode payload = objectMapper.readTree(response.body());
        accessToken = payload.path("access_token").asText(null);
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException("IGDB OAuth response missing access_token");
        }

        long expiresIn = payload.path("expires_in").asLong(3600L);
        tokenExpiresAt = Instant.now().plusSeconds(Math.max(expiresIn - 120L, 60L));
        return accessToken;
    }
}
