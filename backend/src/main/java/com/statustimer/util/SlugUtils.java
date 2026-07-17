package com.statustimer.util;

import java.text.Normalizer;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class SlugUtils {

    private static final Pattern POSSESSIVE_SLUG_PATTERN =
            Pattern.compile("^([a-z0-9]+)-s-(.+)$");

    private static final java.util.Map<String, String> ROMAN_SUFFIXES = java.util.Map.ofEntries(
            java.util.Map.entry("i", "1"),
            java.util.Map.entry("ii", "2"),
            java.util.Map.entry("iii", "3"),
            java.util.Map.entry("iv", "4"),
            java.util.Map.entry("v", "5"),
            java.util.Map.entry("vi", "6"),
            java.util.Map.entry("vii", "7"),
            java.util.Map.entry("viii", "8"),
            java.util.Map.entry("ix", "9"),
            java.util.Map.entry("x", "10")
    );

    private static final String[] NOISE_SUFFIXES = {"tm", "r"};

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
     * Collapse trademark noise and roman-numeral slug variants into one catalog slug.
     */
    public static String normalizeCatalogSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return slug;
        }

        String normalized = slug.trim().toLowerCase();

        boolean changed = true;
        while (changed) {
            changed = false;
            for (String suffix : NOISE_SUFFIXES) {
                String marker = "-" + suffix;
                if (normalized.endsWith(marker)) {
                    normalized = normalized.substring(0, normalized.length() - marker.length());
                    changed = true;
                }
            }
        }

        int separator = normalized.lastIndexOf('-');
        if (separator > 0) {
            String romanSuffix = normalized.substring(separator + 1);
            if (romanSuffix.length() >= 2) {
                String arabicSuffix = ROMAN_SUFFIXES.get(romanSuffix);
                if (arabicSuffix != null) {
                    normalized = normalized.substring(0, separator + 1) + arabicSuffix;
                }
            }
        }

        return normalized;
    }

    private static final Pattern COLLAPSED_DISAMBIGUATION_SUFFIX =
            Pattern.compile("^(.+)-(\\d+)$");

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

    /**
     * IGDB disambiguation uses {@code title--N}; {@link #toSlug} collapses that to {@code title-N}.
     * Restore the double hyphen when looking titles up by slug on IGDB.
     */
    public static Optional<String> toIgdbDisambiguatedSlugVariant(String slug) {
        if (slug == null || slug.isBlank() || slug.contains("--")) {
            return Optional.empty();
        }

        Matcher matcher = COLLAPSED_DISAMBIGUATION_SUFFIX.matcher(slug.trim().toLowerCase());
        if (!matcher.matches()) {
            return Optional.empty();
        }

        return Optional.of(matcher.group(1) + "--" + matcher.group(2));
    }
}
