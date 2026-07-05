package com.statustimer.util;

import java.text.Normalizer;

public final class SlugUtils {

    private SlugUtils() {
    }

    public static String toSlug(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String normalized = Normalizer.normalize(value, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");

        return normalized;
    }
}
