package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SteamStoreSearchClient {

    private static final String STORE_SEARCH_URL =
            "https://store.steampowered.com/api/storesearch/";
    private static final int DEFAULT_LIMIT = 8;

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SteamStoreSearchClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public List<SteamStoreSearchResult> search(String query, int limit) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }

        try {
            String encoded = URLEncoder.encode(trimmed, StandardCharsets.UTF_8);
            URI uri = URI.create(
                    STORE_SEARCH_URL + "?term=" + encoded + "&l=english&cc=US"
            );

            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", "StatusTimer-API/1.0 (+catalog search)")
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() != 200) {
                log.warn("Steam store search failed with HTTP {}", response.statusCode());
                return List.of();
            }

            return parseResults(response.body(), limit);
        } catch (Exception exception) {
            log.warn("Steam store search failed for query '{}'", trimmed, exception);
            return List.of();
        }
    }

    private List<SteamStoreSearchResult> parseResults(String body, int limit) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode items = root.path("items");
            if (!items.isArray()) {
                return List.of();
            }

            List<SteamStoreSearchResult> results = new ArrayList<>();
            for (JsonNode item : items) {
                if (!"app".equals(item.path("type").asText(""))) {
                    continue;
                }

                int appId = item.path("id").asInt(0);
                String name = item.path("name").asText("").trim();
                if (appId <= 0 || name.isEmpty()) {
                    continue;
                }

                String logoUrl = item.path("tiny_image").asText(null);
                results.add(new SteamStoreSearchResult(appId, name, logoUrl));

                if (results.size() >= limit) {
                    break;
                }
            }

            return results;
        } catch (Exception exception) {
            log.warn("Unable to parse Steam store search response", exception);
            return List.of();
        }
    }

    public record SteamStoreSearchResult(
            int appId,
            String name,
            String logoUrl
    ) {
    }
}
