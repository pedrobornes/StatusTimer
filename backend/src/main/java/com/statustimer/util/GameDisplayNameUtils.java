package com.statustimer.util;

import java.util.regex.Pattern;

public final class GameDisplayNameUtils {

    private static final Pattern TRADEMARK_NOISE = Pattern.compile(
            "\\s*(?:™|®|\\(\\s*tm\\s*\\)|\\bTM\\b|\\bR\\b)\\s*",
            Pattern.CASE_INSENSITIVE
    );

    private GameDisplayNameUtils() {
    }

    public static String normalizeDisplayName(String name) {
        if (name == null || name.isBlank()) {
            return name;
        }

        String normalized = TRADEMARK_NOISE.matcher(name.trim()).replaceAll(" ");
        normalized = normalized.replaceAll("\\s{2,}", " ").trim();
        return normalized.isEmpty() ? name.trim() : normalized;
    }
}
