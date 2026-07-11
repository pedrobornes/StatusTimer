package com.statustimer.util;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Normalizes catalog search queries so minor punctuation differences still match titles.
 */
public final class SearchQuerySupport {

    private static final int MIN_TOKEN_LENGTH = 2;

    private SearchQuerySupport() {
    }

    public static String normalizeForMatch(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        return Normalizer.normalize(value, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    /**
     * Search text with punctuation softened for APIs that treat symbols literally.
     */
    public static String relaxedSearchText(String query) {
        String normalized = normalizeForMatch(query);
        return normalized.isBlank() ? "" : normalized;
    }

    public static List<String> searchVariants(String query) {
        if (query == null) {
            return List.of();
        }

        String trimmed = query.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }

        Set<String> variants = new LinkedHashSet<>();
        variants.add(trimmed);

        String relaxed = relaxedSearchText(trimmed);
        if (!relaxed.isBlank() && !relaxed.equalsIgnoreCase(trimmed)) {
            variants.add(relaxed);
        }

        return List.copyOf(variants);
    }

    public static boolean matches(String query, String candidate) {
        String normalizedQuery = normalizeForMatch(query);
        if (normalizedQuery.isEmpty()) {
            return false;
        }

        String normalizedCandidate = normalizeForMatch(candidate);
        if (normalizedCandidate.isEmpty()) {
            return false;
        }

        if (normalizedCandidate.contains(normalizedQuery)) {
            return true;
        }

        return allSignificantTokensPresent(normalizedQuery, normalizedCandidate);
    }

    public static boolean matchesCatalogQuery(String query, String gameName, String slug) {
        if (matches(query, gameName)) {
            return true;
        }

        String slugQuery = SlugUtils.toSlug(query);
        if (!slugQuery.isBlank() && slug != null && !slug.isBlank()) {
            if (slug.toLowerCase(Locale.ROOT).contains(slugQuery)) {
                return true;
            }
        }

        return matches(query, slug == null ? "" : slug.replace('-', ' '));
    }

    private static boolean allSignificantTokensPresent(String normalizedQuery, String normalizedCandidate) {
        String[] tokens = normalizedQuery.split(" ");
        boolean hasSignificantToken = false;

        for (String token : tokens) {
            if (token.length() < MIN_TOKEN_LENGTH) {
                continue;
            }

            hasSignificantToken = true;
            if (!normalizedCandidate.contains(token)) {
                return false;
            }
        }

        return hasSignificantToken;
    }
}
