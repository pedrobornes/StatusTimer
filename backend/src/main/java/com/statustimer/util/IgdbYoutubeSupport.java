package com.statustimer.util;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class IgdbYoutubeSupport {

    private static final Pattern YOUTUBE_VIDEO_ID_PATTERN = Pattern.compile(
            "(?:youtube\\.com/(?:watch\\?v=|embed/|shorts/)|youtu\\.be/)([\\w-]{11})",
            Pattern.CASE_INSENSITIVE
    );

    private IgdbYoutubeSupport() {
    }

    public record YoutubeWebsiteData(String channelUrl, List<String> videoIds) {
    }

    public static YoutubeWebsiteData resolveFromWebsites(JsonNode websites) {
        if (!websites.isArray()) {
            return new YoutubeWebsiteData(null, List.of());
        }

        String channelUrl = null;
        Set<String> videoIds = new LinkedHashSet<>();

        for (JsonNode website : websites) {
            String url = website.path("url").asText("").trim();
            if (url.isEmpty()) {
                continue;
            }

            String lowered = url.toLowerCase();
            if (!lowered.contains("youtube.com") && !lowered.contains("youtu.be")) {
                continue;
            }

            String videoId = parseVideoId(url);
            if (videoId != null) {
                videoIds.add(videoId);
                continue;
            }

            if (isChannelUrl(url)) {
                channelUrl = channelUrl == null ? url : channelUrl;
            }
        }

        return new YoutubeWebsiteData(channelUrl, List.copyOf(videoIds));
    }

    public static List<String> mergeVideoIds(List<String> existing, List<String> extra) {
        if (extra == null || extra.isEmpty()) {
            return existing == null ? List.of() : List.copyOf(existing);
        }

        Set<String> seen = new LinkedHashSet<>();
        List<String> merged = new ArrayList<>();

        if (existing != null) {
            for (String value : existing) {
                if (value != null && !value.isBlank() && seen.add(value.trim())) {
                    merged.add(value.trim());
                }
            }
        }

        for (String value : extra) {
            if (value != null && !value.isBlank() && seen.add(value.trim())) {
                merged.add(value.trim());
            }
        }

        return List.copyOf(merged);
    }

    public static String parseVideoId(String url) {
        Matcher matcher = YOUTUBE_VIDEO_ID_PATTERN.matcher(url);
        if (!matcher.find()) {
            return null;
        }

        String videoId = matcher.group(1);
        return videoId == null || videoId.isBlank() ? null : videoId;
    }

    public static boolean isChannelUrl(String url) {
        String lowered = url.toLowerCase();
        if (!lowered.contains("youtube.com")) {
            return false;
        }

        return lowered.contains("/channel/")
                || lowered.contains("/@")
                || lowered.contains("/c/")
                || lowered.contains("/user/");
    }
}
