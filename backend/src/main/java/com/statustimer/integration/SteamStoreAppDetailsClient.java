package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
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
    private static final Pattern ISO_DATE = Pattern.compile("(\\d{4})-(\\d{2})-(\\d{2})");
    private static final DateTimeFormatter STEAM_LONG_DATE =
            DateTimeFormatter.ofPattern("d MMM, yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter STEAM_SHORT_DATE =
            DateTimeFormatter.ofPattern("MMM d, yyyy", Locale.ENGLISH);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public SteamStoreAppDetailsClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public Optional<SteamAppMetadata> fetchMetadata(int appId) {
        if (appId <= 0) {
            return Optional.empty();
        }

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

            if (response.statusCode() != 200) {
                log.warn("Steam appdetails failed with HTTP {} for app {}", response.statusCode(), appId);
                return Optional.empty();
            }

            return parseMetadata(response.body(), appId);
        } catch (Exception exception) {
            log.warn("Steam appdetails failed for app {}", appId, exception);
            return Optional.empty();
        }
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
                    freeToPlay
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
        if (parseRequiredAge(data.path("required_age").asText("")) >= 18) {
            return true;
        }

        for (JsonNode genre : data.path("genres")) {
            String description = genre.path("description").asText("").toLowerCase(Locale.ROOT);
            if (containsAdultKeyword(description)) {
                return true;
            }
        }

        for (JsonNode category : data.path("categories")) {
            String description = category.path("description").asText("").toLowerCase(Locale.ROOT);
            if (containsAdultKeyword(description)) {
                return true;
            }
        }

        for (JsonNode descriptorId : data.path("content_descriptors").path("ids")) {
            int id = descriptorId.asInt(0);
            if (id == 1 || id == 3 || id == 4 || id == 5) {
                return true;
            }
        }

        String descriptorNotes = data.path("content_descriptors").path("notes").asText("")
                .toLowerCase(Locale.ROOT);
        return containsAdultKeyword(descriptorNotes);
    }

    private int parseRequiredAge(String value) {
        if (value == null || value.isBlank()) {
            return 0;
        }

        String digits = value.replaceAll("\\D+", "");
        if (digits.isEmpty()) {
            return 0;
        }

        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private boolean containsAdultKeyword(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        return value.contains("sexual")
                || value.contains("nudity")
                || value.contains("hentai")
                || value.contains("adult only")
                || value.contains("nsfw")
                || value.contains("pornographic")
                || value.contains("mature content")
                || value.equals("adult");
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
            boolean freeToPlay
    ) {
    }
}
