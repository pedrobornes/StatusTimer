package com.statustimer.util;

import java.text.Normalizer;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class SlugUtils {

    private static final Pattern POSSESSIVE_SLUG_PATTERN =
            Pattern.compile("^([a-z0-9]+)-s-(.+)$");

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

    /**
     * IGDB slugs merge possessive "'s" into the preceding word (e.g. {@code assassins-creed})
     * while StatusTimer splits on the apostrophe ({@code assassin-s-creed}).
     */
    public static Optional<String> toIgdbPossessiveSlugVariant(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }

        Matcher matcher = POSSESSIVE_SLUG_PATTERN.matcher(slug);
        if (!matcher.matches()) {
            return Optional.empty();
        }

        return Optional.of(matcher.group(1) + "s-" + matcher.group(2));
    }
}
