package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.statustimer.config.IgdbProperties;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class IgdbSearchClient {

    private static final int STEAM_EXTERNAL_CATEGORY = 1;
    private static final int MAIN_GAME_CATEGORY = 0;
    private static final String GAME_FIELDS =
            "id,name,slug,category,cover.image_id,artworks.image_id,hypes,rating,aggregated_rating,"
                    + "genres.name,themes.name,external_games.uid,external_games.category";

    private final IgdbApiClient apiClient;
    private final IgdbProperties properties;

    public boolean isConfigured() {
        return apiClient.isConfigured();
    }

    public List<IgdbGameMatch> search(String query, int limit) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty() || !apiClient.isConfigured()) {
            return List.of();
        }

        int resolvedLimit = limit > 0 ? limit : properties.getSearchLimit();
        int fetchLimit = Math.max(resolvedLimit * 3, resolvedLimit);
        String escaped = trimmed.replace("\"", "\\\"");
        String body = "fields " + GAME_FIELDS + "; "
                + "where category = " + MAIN_GAME_CATEGORY + "; "
                + "search \"" + escaped + "\"; "
                + "limit " + fetchLimit + ";";

        Optional<JsonNode> payload = apiClient.postGamesQuery(body);
        if (payload.isEmpty() || !payload.get().isArray()) {
            log.warn("IGDB search returned no payload for query '{}'", trimmed);
            return List.of();
        }

        int rawCount = payload.get().size();
        List<IgdbGameMatch> matches = new ArrayList<>();
        for (JsonNode row : payload.get()) {
            if (!IgdbGameCategories.isMainGame(row)) {
                continue;
            }

            parseMatch(row).ifPresent(matches::add);
            if (matches.size() >= resolvedLimit) {
                break;
            }
        }

        if (matches.isEmpty()) {
            log.warn(
                    "IGDB search for '{}' returned {} raw row(s) but no main-game matches",
                    trimmed,
                    rawCount
            );
        }

        return matches;
    }

    private Optional<IgdbGameMatch> parseMatch(JsonNode row) {
        if (!IgdbGameCategories.isMainGame(row)) {
            return Optional.empty();
        }

        String name = row.path("name").asText("").trim();
        if (name.isEmpty()) {
            return Optional.empty();
        }

        long igdbId = row.path("id").asLong(0L);
        if (igdbId <= 0) {
            return Optional.empty();
        }

        String coverImageId = row.path("cover").path("image_id").asText(null);
        String logoUrl = resolveLogoUrl(row, coverImageId);
        String coverUrl = IgdbImageUrls.coverBig(coverImageId);

        return Optional.of(new IgdbGameMatch(
                igdbId,
                name,
                row.path("slug").asText(""),
                logoUrl,
                coverUrl,
                resolveSteamAppId(row.path("external_games")),
                normalizeRating(row.path("rating")),
                normalizeRating(row.path("aggregated_rating")),
                parseNames(row.path("themes")),
                parseNames(row.path("genres")),
                row.path("hypes").asInt(0)
        ));
    }

    private String resolveLogoUrl(JsonNode row, String coverImageId) {
        JsonNode artworks = row.path("artworks");
        if (artworks.isArray()) {
            for (JsonNode artwork : artworks) {
                String imageId = artwork.path("image_id").asText(null);
                String thumb = IgdbImageUrls.thumb(imageId);
                if (thumb != null) {
                    return thumb;
                }
            }
        }

        return IgdbImageUrls.coverSmall(coverImageId);
    }

    private Integer resolveSteamAppId(JsonNode externalGames) {
        if (!externalGames.isArray()) {
            return null;
        }

        for (JsonNode entry : externalGames) {
            int category = entry.path("category").asInt(STEAM_EXTERNAL_CATEGORY);
            if (entry.has("category") && category != STEAM_EXTERNAL_CATEGORY) {
                continue;
            }

            String uid = entry.path("uid").asText("").trim();
            if (uid.matches("\\d+")) {
                return Integer.parseInt(uid);
            }
        }

        return null;
    }

    private List<String> parseNames(JsonNode values) {
        if (!values.isArray()) {
            return List.of();
        }

        List<String> names = new ArrayList<>();
        for (JsonNode value : values) {
            if (value.isObject()) {
                String name = value.path("name").asText("").trim();
                if (!name.isEmpty()) {
                    names.add(name);
                }
                continue;
            }

            String raw = value.asText("").trim();
            if (!raw.isEmpty()) {
                names.add(raw);
            }
        }

        return List.copyOf(names);
    }

    private Integer normalizeRating(JsonNode value) {
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }

        int rating = Math.round(value.floatValue());
        if (rating < 0) {
            return null;
        }

        return Math.min(rating, 100);
    }

    public record IgdbGameMatch(
            long igdbId,
            String name,
            String igdbSlug,
            String logoUrl,
            String coverUrl,
            Integer steamAppId,
            Integer userRating,
            Integer criticRating,
            List<String> themes,
            List<String> genreNames,
            int hypeCount
    ) {
    }
}
