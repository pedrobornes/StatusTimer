package com.statustimer.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.statustimer.config.GameAssetPolicy;
import com.statustimer.config.CatalogMatureContentPolicy;
import com.statustimer.config.IgdbProperties;
import com.statustimer.util.IgdbExternalLinksSupport;
import com.statustimer.util.IgdbPlatformSupport;
import com.statustimer.util.IgdbYoutubeSupport;
import com.statustimer.util.IgdbYoutubeSupport.YoutubeWebsiteData;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class IgdbSearchClient {

    private static final int STEAM_EXTERNAL_CATEGORY = 1;
    private static final String GAME_FIELDS =
            "id,name,slug,category,game_type,first_release_date,platforms,cover.image_id,artworks.image_id,artworks.width,artworks.height,screenshots.image_id,screenshots.width,screenshots.height,"
                    + "hypes,rating,aggregated_rating,genres.name,themes.name,videos.video_id,websites.url,websites.category,"
                    + "external_games.uid,external_games.category,external_games.url";

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
                + "where game_type = " + IgdbGameCategories.MAIN_GAME_TYPE + "; "
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

            if (!IgdbPlatformSupport.hasSupportedPlatform(row.path("platforms"))) {
                continue;
            }

            parseMatch(row).ifPresent(matches::add);
            if (matches.size() >= resolvedLimit) {
                break;
            }
        }

        if (matches.isEmpty()) {
            log.debug(
                    "IGDB search for '{}' returned {} raw row(s) but no main-game matches",
                    trimmed,
                    rawCount
            );
        }

        return matches;
    }

    public Optional<IgdbGameMatch> lookupBySlug(String slug) {
        String trimmed = slug == null ? "" : slug.trim();
        if (trimmed.isEmpty() || !apiClient.isConfigured()) {
            return Optional.empty();
        }

        String escaped = trimmed.replace("\"", "\\\"");
        String body = "fields " + GAME_FIELDS + "; "
                + "where slug = \"" + escaped + "\"; "
                + "limit 1;";

        Optional<JsonNode> payload = apiClient.postGamesQuery(body);
        if (payload.isEmpty() || !payload.get().isArray() || payload.get().isEmpty()) {
            return Optional.empty();
        }

        JsonNode row = payload.get().get(0);
        if (!IgdbGameCategories.isMainGame(row)) {
            return Optional.empty();
        }

        return parseMatch(row);
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
        List<String> screenshotUrls = resolveScreenshotUrls(row.path("screenshots"));
        List<String> trailerVideoIds = resolveTrailerVideoIds(
                row.path("videos"),
                row.path("websites")
        );
        YoutubeWebsiteData youtubeData = IgdbYoutubeSupport.resolveFromWebsites(row.path("websites"));
        Map<String, String> externalLinks = IgdbExternalLinksSupport.resolveExternalLinks(
                row.path("websites"),
                row.path("external_games"),
                resolveSteamAppId(row.path("external_games")),
                youtubeData.channelUrl()
        );

        List<String> genreNames = parseNames(row.path("genres"));
        List<String> themeNames = parseNames(row.path("themes"));
        if (CatalogMatureContentPolicy.hasMatureLabels(genreNames)
                || CatalogMatureContentPolicy.hasMatureLabels(themeNames)) {
            return Optional.empty();
        }

        return Optional.of(new IgdbGameMatch(
                igdbId,
                name,
                row.path("slug").asText(""),
                logoUrl,
                coverUrl,
                resolveSteamAppId(row.path("external_games")),
                normalizeRating(row.path("rating")),
                normalizeRating(row.path("aggregated_rating")),
                genreNames,
                themeNames,
                row.path("hypes").asInt(0),
                parseFirstReleaseDate(row.path("first_release_date")),
                screenshotUrls,
                trailerVideoIds,
                youtubeData.channelUrl(),
                externalLinks
        ));
    }

    private String resolveLogoUrl(JsonNode row, String coverImageId) {
        String bestArtworkHero = resolveBestLandscapeHero(row.path("artworks"));
        if (bestArtworkHero != null) {
            return bestArtworkHero;
        }

        return resolveFirstHero(row.path("artworks"));
    }

    private String resolveBestLandscapeHero(JsonNode imageNodes) {
        if (!imageNodes.isArray()) {
            return null;
        }

        String bestLandscape = null;
        long bestLandscapeArea = -1L;

        for (JsonNode node : imageNodes) {
            String imageId = node.path("image_id").asText(null);
            if (!GameAssetPolicy.isArtworkImageId(imageId)) {
                continue;
            }

            String heroUrl = IgdbImageUrls.screenshotHuge(imageId);
            if (heroUrl == null) {
                continue;
            }

            int width = node.path("width").asInt(0);
            int height = node.path("height").asInt(0);
            if (!GameAssetPolicy.meetsHeroDimensionThreshold(width, height)) {
                continue;
            }

            long area = (long) width * height;

            if (bestLandscape == null || area > bestLandscapeArea) {
                bestLandscape = heroUrl;
                bestLandscapeArea = area;
            }
        }

        return bestLandscape;
    }

    private String resolveFirstHero(JsonNode imageNodes) {
        if (!imageNodes.isArray()) {
            return null;
        }

        for (JsonNode node : imageNodes) {
            String imageId = node.path("image_id").asText(null);
            if (!GameAssetPolicy.isArtworkImageId(imageId)) {
                continue;
            }

            String heroUrl = IgdbImageUrls.screenshotHuge(imageId);
            if (heroUrl == null) {
                continue;
            }

            int width = node.path("width").asInt(0);
            int height = node.path("height").asInt(0);
            if (!GameAssetPolicy.meetsHeroDimensionThreshold(width, height)) {
                continue;
            }

            return heroUrl;
        }

        return null;
    }

    private Integer resolveSteamAppId(JsonNode externalGames) {
        if (!externalGames.isArray()) {
            return null;
        }

        Integer fallbackFromUrl = null;

        for (JsonNode entry : externalGames) {
            if (entry.has("category")
                    && entry.path("category").asInt(-1) == STEAM_EXTERNAL_CATEGORY) {
                Integer fromUid = parseSteamUid(entry.path("uid"));
                if (fromUid != null) {
                    return fromUid;
                }
            }

            Integer fromUrl = parseSteamAppIdFromUrl(entry.path("url").asText(""));
            if (fromUrl != null) {
                fallbackFromUrl = fromUrl;
            }
        }

        return fallbackFromUrl;
    }

    private Integer parseSteamUid(JsonNode uidNode) {
        if (uidNode.canConvertToInt()) {
            int uid = uidNode.asInt(-1);
            if (uid > 0) {
                return uid;
            }
        }

        String uidText = uidNode.asText("").trim();
        if (uidText.matches("\\d+")) {
            return Integer.valueOf(uidText);
        }

        return null;
    }

    private Integer parseSteamAppIdFromUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }

        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("store\\.steampowered\\.com/app/(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(url);
        if (!matcher.find()) {
            return null;
        }

        try {
            int appId = Integer.parseInt(matcher.group(1));
            return appId > 0 ? appId : null;
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private List<String> resolveScreenshotUrls(JsonNode screenshots) {
        if (!screenshots.isArray()) {
            return List.of();
        }

        List<String> urls = new ArrayList<>();
        for (JsonNode screenshot : screenshots) {
            String imageId = screenshot.path("image_id").asText(null);
            String url = IgdbImageUrls.screenshotHuge(imageId);
            if (url != null) {
                urls.add(url);
            }
        }

        return List.copyOf(urls);
    }

    private List<String> resolveTrailerVideoIds(JsonNode videos, JsonNode websites) {
        List<String> trailerIds = new ArrayList<>();

        if (videos.isArray()) {
            for (JsonNode video : videos) {
                String videoId = video.path("video_id").asText("").trim();
                if (!videoId.isEmpty()) {
                    trailerIds.add(videoId);
                }
            }
        }

        YoutubeWebsiteData youtubeData = IgdbYoutubeSupport.resolveFromWebsites(websites);
        return IgdbYoutubeSupport.mergeVideoIds(trailerIds, youtubeData.videoIds());
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

    private LocalDate parseFirstReleaseDate(JsonNode value) {
        if (value.isMissingNode() || value.isNull()) {
            return null;
        }

        long epochSeconds = value.asLong(0L);
        if (epochSeconds <= 0L) {
            return null;
        }

        return Instant.ofEpochSecond(epochSeconds).atZone(ZoneOffset.UTC).toLocalDate();
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
            List<String> genreNames,
            List<String> themeNames,
            int hypeCount,
            LocalDate firstReleaseDate,
            List<String> screenshotUrls,
            List<String> trailerVideoIds,
            String youtubeChannelUrl,
            Map<String, String> externalLinks
    ) {
    }
}
