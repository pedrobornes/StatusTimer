package com.statustimer.util;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class IgdbExternalLinksSupport {

    private static final int STEAM_EXTERNAL_CATEGORY = 1;
    private static final int EPIC_EXTERNAL_CATEGORY = 13;
    private static final int OFFICIAL_WEBSITE_CATEGORY = 1;
    private static final int YOUTUBE_WEBSITE_CATEGORY = 9;
    private static final int STEAM_WEBSITE_CATEGORY = 13;
    private static final int REDDIT_WEBSITE_CATEGORY = 14;
    private static final int EPIC_WEBSITE_CATEGORY = 16;

    private static final Set<String> ALLOWED_KEYS = Set.of(
            "steam",
            "epic",
            "youtube",
            "reddit",
            "official"
    );

    private static final Pattern STEAM_STORE_URL_PATTERN = Pattern.compile(
            "store\\.steampowered\\.com/app/(\\d+)",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern EPIC_STORE_URL_PATTERN = Pattern.compile(
            "epicgames\\.com/(?:store|en-US)",
            Pattern.CASE_INSENSITIVE
    );
    private static final Pattern REDDIT_SUBREDDIT_PATTERN = Pattern.compile(
            "reddit\\.com/r/([\\w_]+)",
            Pattern.CASE_INSENSITIVE
    );

    private IgdbExternalLinksSupport() {
    }

    public static Map<String, String> resolveExternalLinks(
            JsonNode websites,
            JsonNode externalGames,
            Integer steamAppId,
            String youtubeChannelUrl
    ) {
        Map<String, String> links = new LinkedHashMap<>();

        if (websites.isArray()) {
            for (JsonNode website : websites) {
                String url = website.path("url").asText("").trim();
                if (url.isEmpty()) {
                    continue;
                }

                int category = website.path("category").asInt(-1);
                if (category == OFFICIAL_WEBSITE_CATEGORY) {
                    links.put("official", url);
                    continue;
                }

                if (category == REDDIT_WEBSITE_CATEGORY) {
                    putRedditLink(links, url);
                    continue;
                }

                if (category == EPIC_WEBSITE_CATEGORY || isEpicStoreUrl(url)) {
                    links.put("epic", url);
                    continue;
                }

                if (category == STEAM_WEBSITE_CATEGORY || parseSteamAppIdFromUrl(url) != null) {
                    links.put("steam", url);
                    continue;
                }

                if (category == YOUTUBE_WEBSITE_CATEGORY && IgdbYoutubeSupport.isChannelUrl(url)) {
                    links.put("youtube", url);
                    continue;
                }

                String lowered = url.toLowerCase();
                if (lowered.contains("reddit.com/r/")) {
                    putRedditLink(links, url);
                } else if (isEpicStoreUrl(url)) {
                    links.put("epic", url);
                } else if (parseSteamAppIdFromUrl(url) != null) {
                    links.put("steam", url);
                } else if (lowered.contains("youtube.com") && IgdbYoutubeSupport.isChannelUrl(url)) {
                    links.put("youtube", url);
                }
            }
        }

        if (externalGames.isArray()) {
            for (JsonNode entry : externalGames) {
                String url = entry.path("url").asText("").trim();
                int category = entry.path("category").asInt(-1);

                if (category == STEAM_EXTERNAL_CATEGORY || parseSteamAppIdFromUrl(url) != null) {
                    if (!url.isEmpty()) {
                        links.put("steam", url);
                    }
                    continue;
                }

                if (category == EPIC_EXTERNAL_CATEGORY || isEpicStoreUrl(url)) {
                    if (!url.isEmpty()) {
                        links.put("epic", url);
                    }
                }
            }
        }

        if (steamAppId != null && steamAppId > 0 && !links.containsKey("steam")) {
            links.put("steam", "https://store.steampowered.com/app/" + steamAppId + "/");
        }

        if (youtubeChannelUrl != null && !youtubeChannelUrl.isBlank() && !links.containsKey("youtube")) {
            links.put("youtube", youtubeChannelUrl.trim());
        }

        Map<String, String> filtered = new LinkedHashMap<>();
        for (String key : ALLOWED_KEYS) {
            String value = links.get(key);
            if (value != null && !value.isBlank()) {
                filtered.put(key, value.trim());
            }
        }

        return Map.copyOf(filtered);
    }

    private static void putRedditLink(Map<String, String> links, String url) {
        String normalized = normalizeRedditUrl(url);
        if (normalized != null) {
            links.put("reddit", normalized);
        }
    }

    public static String normalizeRedditUrl(String url) {
        Matcher matcher = REDDIT_SUBREDDIT_PATTERN.matcher(url);
        if (!matcher.find()) {
            return null;
        }

        String subreddit = matcher.group(1);
        if (subreddit == null || subreddit.isBlank()) {
            return null;
        }

        return "https://www.reddit.com/r/" + subreddit.trim() + "/";
    }

    private static boolean isEpicStoreUrl(String url) {
        return EPIC_STORE_URL_PATTERN.matcher(url).find();
    }

    private static Integer parseSteamAppIdFromUrl(String url) {
        Matcher matcher = STEAM_STORE_URL_PATTERN.matcher(url);
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
}
