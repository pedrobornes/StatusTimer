package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.statustimer.config.CatalogMatureContentPolicy;
import com.statustimer.config.GameTypeResolver;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class SteamStoreAppDetailsClient {

    private static final String APP_DETAILS_URL =
            "https://store.steampowered.com/api/appdetails";
    private static final long MIN_REQUEST_INTERVAL_MS = 1_500L;
    private static final long RATE_LIMIT_COOLDOWN_MS = 120_000L;
    private static final Pattern ISO_DATE = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");
    private static final DateTimeFormatter STEAM_LONG_DATE =
            DateTimeFormatter.ofPattern("d MMM, yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter STEAM_SHORT_DATE =
            DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private long lastRequestAtMs;
    private long rateLimitedUntilMs;

    public SteamStoreAppDetailsClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public boolean isRateLimited() {
        return System.currentTimeMillis() < rateLimitedUntilMs;
    }

    public Optional<SteamAppMetadata> fetchMetadata(int appId) {
        if (appId <= 0) {
            return Optional.empty();
        }

        if (isRateLimited()) {
            log.debug("Steam appdetails skipped for app {} while rate-limit cooldown is active", appId);
            return Optional.empty();
        }

        throttleBeforeRequest();

        try {
            URI uri = URI.create(
                    APP_DETAILS_URL + "?appids=" + appId + "&cc=us&l=english"
            );

            HttpRequest request = HttpRequest.newBuilder(uri)
                    .timeout(Duration.ofSeconds(15))
                    .header("User-Agent", "StatusTimer-API/1.0 (+catalog metadata)")
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() == 429) {
                rateLimitedUntilMs = System.currentTimeMillis() + RATE_LIMIT_COOLDOWN_MS;
                log.warn(
                        "Steam appdetails rate limited (HTTP 429) for app {}; pausing Steam enrichment for {}s",
                        appId,
                        RATE_LIMIT_COOLDOWN_MS / 1000
                );
                return Optional.empty();
            }

            if (response.statusCode() != 200) {
                log.warn("Steam appdetails failed with HTTP {} for app {}", response.statusCode(), appId);
                return Optional.empty();
            }

            return parseMetadata(response.body(), appId);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            log.warn("Steam appdetails interrupted for app {}", appId);
            return Optional.empty();
        } catch (Exception exception) {
            log.warn("Steam appdetails failed for app {}", appId, exception);
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

    private Optional<SteamAppMetadata> parseMetadata(String body, int appId) {
        try {
            JsonNode root = objectMapper.readTree(body);
            JsonNode appNode = root.path(String.valueOf(appId));
            if (!appNode.path("success").asBoolean(false)) {
                return Optional.empty();
            }

            JsonNode data = appNode.path("data");
            LocalDate releaseDate = parseReleaseDate(data.path("release_date"));
            boolean adultContent = detectAdultContent(data);
            JsonNode priceOverview = data.path("price_overview");
            Integer priceFinal = parsePriceCents(priceOverview.path("final"));
            String currency = readText(priceOverview, "currency");
            boolean freeToPlay = priceFinal != null && priceFinal == 0
                    || data.path("is_free").asBoolean(false);
            if (priceFinal == null && freeToPlay) {
                priceFinal = 0;
            }

            JsonNode platforms = data.path("platforms");
            boolean windows = platforms.path("windows").asBoolean(false);
            boolean mac = platforms.path("mac").asBoolean(false);
            boolean linux = platforms.path("linux").asBoolean(false);
            List<Integer> categoryIds = parseCategoryIds(data);

            return Optional.of(new SteamAppMetadata(
                    releaseDate,
                    adultContent,
                    null,
                    null,
                    readText(data, "short_description"),
                    priceFinal,
                    currency,
                    windows,
                    mac,
                    linux,
                    freeToPlay,
                    categoryIds
            ));
        } catch (Exception exception) {
            log.warn("Unable to parse Steam appdetails for app {}", appId, exception);
            return Optional.empty();
        }
    }

    private String resolveLogoUrl(JsonNode data) {
        String capsule = readText(data, "capsule_image");
        if (capsule != null) {
            return capsule;
        }

        return readText(data, "capsule_imagev5");
    }

    private String resolveCoverUrl(JsonNode data) {
        String header = readText(data, "header_image");
        if (header != null) {
            return header;
        }

        return readText(data, "background_raw");
    }

    private String readText(JsonNode node, String field) {
        String value = node.path(field).asText("").trim();
        return value.isEmpty() ? null : value;
    }

    private LocalDate parseReleaseDate(JsonNode releaseDateNode) {
        String rawDate = releaseDateNode.path("date").asText("").trim();
        if (rawDate.isEmpty()) {
            return null;
        }

        Matcher isoMatcher = ISO_DATE.matcher(rawDate);
        if (isoMatcher.find()) {
            try {
                return LocalDate.parse(isoMatcher.group());
            } catch (DateTimeParseException ignored) {
                return null;
            }
        }

        for (DateTimeFormatter formatter : new DateTimeFormatter[] {
                STEAM_LONG_DATE, STEAM_SHORT_DATE
        }) {
            try {
                return LocalDate.parse(rawDate, formatter);
            } catch (DateTimeParseException ignored) {
                // try next pattern
            }
        }

        if (rawDate.matches("\\d{4}")) {
            return LocalDate.of(Integer.parseInt(rawDate), 1, 1);
        }

        return null;
    }

    private boolean detectAdultContent(JsonNode data) {
        java.util.List<Integer> descriptorIds = new java.util.ArrayList<>();
        for (JsonNode descriptorId : data.path("content_descriptors").path("ids")) {
            descriptorIds.add(descriptorId.asInt(0));
        }

        return CatalogMatureContentPolicy.isSteamExplicitSexualListing(descriptorIds);
    }

    private List<Integer> parseCategoryIds(JsonNode data) {
        List<Integer> categoryIds = new ArrayList<>();
        for (JsonNode category : data.path("categories")) {
            int id = category.path("id").asInt(0);
            if (id > 0) {
                categoryIds.add(id);
            }
        }
        return List.copyOf(categoryIds);
    }

    private Integer parsePriceCents(JsonNode value) {
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }

        if (!value.canConvertToInt()) {
            return null;
        }

        int cents = value.asInt(-1);
        return cents >= 0 ? cents : null;
    }

    public record SteamAppMetadata(
            LocalDate releaseDate,
            boolean adultContent,
            String logoUrl,
            String coverUrl,
            String shortDescription,
            Integer priceFinal,
            String currency,
            boolean windows,
            boolean mac,
            boolean linux,
            boolean freeToPlay,
            List<Integer> categoryIds
    ) {
    }
}
