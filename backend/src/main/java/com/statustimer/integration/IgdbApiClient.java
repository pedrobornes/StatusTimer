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

    private final IgdbProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    private String accessToken;
    private Instant tokenExpiresAt = Instant.EPOCH;

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

    public Optional<JsonNode> postGamesQuery(String body) {
        if (!isConfigured()) {
            return Optional.empty();
        }

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

            if (response.statusCode() != 200) {
                log.warn(
                        "IGDB games query failed with HTTP {}: {}",
                        response.statusCode(),
                        response.body()
                );
                return Optional.empty();
            }

            return Optional.of(objectMapper.readTree(response.body()));
        } catch (Exception exception) {
            log.warn("IGDB games query failed", exception);
            return Optional.empty();
        }
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
