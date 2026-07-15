package com.statustimer.config;

import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.util.SearchQuerySupport;
import com.statustimer.util.SlugUtils;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Collapses IGDB/Steam SKU variants (Deluxe, Anniversary, year editions…) in search results
 * when the user is looking for the base franchise title.
 */
public final class CatalogEditionCollapsePolicy {

    private static final Pattern YEAR_EDITION_TITLE_SUFFIX = Pattern.compile(
            "\\s+\\d{4}\\s+(?:deluxe\\s+)?edition\\s*$",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern YEAR_EDITION_SLUG_SUFFIX = Pattern.compile(
            "-\\d{4}(?:-deluxe)?-edition$",
            Pattern.CASE_INSENSITIVE
    );

    private static final String[] TITLE_EDITION_SUFFIXES = {
            " game of the year edition",
            " digital deluxe edition",
            " collectors edition",
            " collector's edition",
            " deluxe edition",
            " anniversary edition",
            " champions edition",
            " ultimate edition",
            " complete edition",
            " premium edition",
            " standard edition",
            " gold edition",
            " x edition",
            " edition",
    };

    private static final String[] SLUG_EDITION_SUFFIXES = {
            "-game-of-the-year-edition",
            "-digital-deluxe-edition",
            "-collectors-edition",
            "-collector-s-edition",
            "-deluxe-edition",
            "-anniversary-edition",
            "-champions-edition",
            "-ultimate-edition",
            "-complete-edition",
            "-premium-edition",
            "-standard-edition",
            "-gold-edition",
            "-x-edition",
            "-edition",
    };

    private static final String[] EDITION_QUERY_MARKERS = {
            "deluxe",
            "anniversary",
            "champions",
            "ultimate",
            "complete",
            "premium",
            "standard",
            "gold",
            "collector",
            "goty",
            "classic",
            "edition",
            "2020",
            "2021",
            "2022",
            "2023",
            "2024",
            "2025",
            "2026",
    };

    private static final String WORLD_OF_WARCRAFT_FRANCHISE = "world-of-warcraft";

    private CatalogEditionCollapsePolicy() {
    }

    public static List<GameCatalogSearchResponse> collapseSearchResults(
            List<GameCatalogSearchResponse> results,
            String query
    ) {
        if (results == null || results.size() <= 1 || !shouldCollapseForQuery(query)) {
            return results == null ? List.of() : results;
        }

        Map<String, List<GameCatalogSearchResponse>> grouped = new LinkedHashMap<>();

        for (GameCatalogSearchResponse result : results) {
            String franchiseKey = resolveFranchiseKey(result.gameName(), result.slug());
            if (franchiseKey.isBlank()) {
                franchiseKey = result.slug() == null ? "" : result.slug();
            }

            grouped.computeIfAbsent(franchiseKey, ignored -> new ArrayList<>()).add(result);
        }

        List<GameCatalogSearchResponse> collapsed = new ArrayList<>(grouped.size());

        for (List<GameCatalogSearchResponse> variants : grouped.values()) {
            if (variants.size() == 1) {
                collapsed.add(variants.getFirst());
                continue;
            }

            String franchiseKey = resolveFranchiseKey(
                    variants.getFirst().gameName(),
                    variants.getFirst().slug()
            );
            GameCatalogSearchResponse preferred = alignToCanonicalFranchise(
                    selectPreferredVariant(variants, franchiseKey),
                    franchiseKey,
                    variants
            );
            collapsed.add(mergeSiblingCatalogMetrics(preferred, variants));
        }

        return collapsed;
    }

    public static String resolveFranchiseKey(String gameName, String slug) {
        String slugKey = stripEditionSuffixesFromSlug(slug);
        String variantCanonical = resolveKnownFranchiseVariantCanonical(slugKey, gameName);
        if (variantCanonical != null) {
            return variantCanonical;
        }

        String fromTitle = SlugUtils.toSlug(stripEditionSuffixesFromTitle(gameName));
        variantCanonical = resolveKnownFranchiseVariantCanonical(fromTitle, gameName);
        if (variantCanonical != null) {
            return variantCanonical;
        }

        if (!fromTitle.isBlank()) {
            return fromTitle;
        }

        return slugKey;
    }

    public static boolean shouldCollapseForQuery(String query) {
        String normalized = SearchQuerySupport.normalizeForMatch(query);
        if (normalized.isBlank()) {
            return false;
        }

        for (String marker : EDITION_QUERY_MARKERS) {
            if (normalized.contains(marker)) {
                return false;
            }
        }

        return true;
    }

    static String stripEditionSuffixesFromTitle(String gameName) {
        if (gameName == null || gameName.isBlank()) {
            return "";
        }

        String normalized = Normalizer.normalize(gameName, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .trim();

        boolean changed = true;
        while (changed && !normalized.isBlank()) {
            changed = false;
            String lower = normalized.toLowerCase(Locale.ROOT);

            String yearStripped = YEAR_EDITION_TITLE_SUFFIX.matcher(normalized).replaceFirst("").trim();
            if (!yearStripped.equals(normalized)) {
                normalized = yearStripped;
                changed = true;
                continue;
            }

            for (String suffix : TITLE_EDITION_SUFFIXES) {
                if (lower.endsWith(suffix)) {
                    normalized = normalized.substring(0, normalized.length() - suffix.length()).trim();
                    changed = true;
                    break;
                }
            }
        }

        return normalized;
    }

    static String stripEditionSuffixesFromSlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return "";
        }

        String normalized = SlugUtils.normalizeCatalogSlug(slug);
        boolean changed = true;

        while (changed && !normalized.isBlank()) {
            changed = false;

            String yearStripped = YEAR_EDITION_SLUG_SUFFIX.matcher(normalized).replaceFirst("").trim();
            if (!yearStripped.equals(normalized)) {
                normalized = yearStripped;
                changed = true;
                continue;
            }

            for (String suffix : SLUG_EDITION_SUFFIXES) {
                if (normalized.endsWith(suffix)) {
                    normalized = normalized.substring(0, normalized.length() - suffix.length());
                    changed = true;
                    break;
                }
            }
        }

        return normalized;
    }

    private static String resolveKnownFranchiseVariantCanonical(String slugKey, String gameName) {
        if (slugKey != null
                && slugKey.startsWith(WORLD_OF_WARCRAFT_FRANCHISE)
                && slugKey.contains("classic")) {
            return WORLD_OF_WARCRAFT_FRANCHISE;
        }

        if (gameName != null && !gameName.isBlank()) {
            String normalizedTitle = SearchQuerySupport.normalizeForMatch(gameName);
            if (normalizedTitle.contains("world of warcraft") && normalizedTitle.contains("classic")) {
                return WORLD_OF_WARCRAFT_FRANCHISE;
            }
        }

        return null;
    }

    private static GameCatalogSearchResponse selectPreferredVariant(
            List<GameCatalogSearchResponse> variants,
            String franchiseKey
    ) {
        return variants.stream()
                .min(Comparator
                        .comparingInt((GameCatalogSearchResponse candidate) ->
                                editionPreferenceScore(candidate, franchiseKey))
                        .thenComparingInt(candidate -> candidate.slug() == null ? Integer.MAX_VALUE : candidate.slug().length())
                        .thenComparing(
                                candidate -> candidate.userRating() == null ? Integer.MIN_VALUE : -candidate.userRating()
                        ))
                .orElse(variants.getFirst());
    }

    private static int editionPreferenceScore(GameCatalogSearchResponse candidate, String franchiseKey) {
        int score = 0;

        if (candidate.slug() != null && candidate.slug().equals(franchiseKey)) {
            score -= 1_000;
        }

        if (!containsEditionMarker(candidate.gameName())) {
            score -= 500;
        }

        if (isKnownFranchiseVariant(candidate.slug(), candidate.gameName(), franchiseKey)) {
            score += 800;
        }

        if (TrackedGameCatalog.findBySlug(candidate.slug()).isPresent()) {
            score -= 200;
        }

        if (PinnedGamePolicy.isPinned(candidate.slug())) {
            score -= 100;
        }

        return score;
    }

    private static boolean containsEditionMarker(String gameName) {
        if (gameName == null || gameName.isBlank()) {
            return false;
        }

        String stripped = stripEditionSuffixesFromTitle(gameName);
        return !SearchQuerySupport.normalizeForMatch(stripped)
                .equals(SearchQuerySupport.normalizeForMatch(gameName));
    }

    private static boolean isKnownFranchiseVariant(String slug, String gameName, String franchiseKey) {
        if (franchiseKey == null || franchiseKey.isBlank() || slug == null || slug.equals(franchiseKey)) {
            return false;
        }

        String canonical = resolveKnownFranchiseVariantCanonical(
                stripEditionSuffixesFromSlug(slug),
                gameName
        );
        return franchiseKey.equals(canonical);
    }

    private static GameCatalogSearchResponse alignToCanonicalFranchise(
            GameCatalogSearchResponse preferred,
            String franchiseKey,
            List<GameCatalogSearchResponse> variants
    ) {
        if (franchiseKey == null
                || franchiseKey.isBlank()
                || franchiseKey.equals(preferred.slug())) {
            return preferred;
        }

        return variants.stream()
                .filter(variant -> franchiseKey.equals(variant.slug()))
                .findFirst()
                .orElseGet(() -> TrackedGameCatalog.findBySlug(franchiseKey)
                        .map(tracked -> new GameCatalogSearchResponse(
                                preferred.id(),
                                franchiseKey,
                                tracked.gameName(),
                                preferred.logoUrl(),
                                preferred.coverUrl(),
                                preferred.steamAppId(),
                                preferred.userRating(),
                                preferred.criticRating(),
                                preferred.genreName(),
                                preferred.genreNames(),
                                preferred.livePlayers(),
                                preferred.twitchViewers(),
                                preferred.upcomingRelease(),
                                preferred.releaseDate()
                        ))
                        .orElse(preferred));
    }

    private static GameCatalogSearchResponse mergeSiblingCatalogMetrics(
            GameCatalogSearchResponse preferred,
            List<GameCatalogSearchResponse> variants
    ) {
        Integer steamAppId = preferred.steamAppId();
        Long livePlayers = preferred.livePlayers();
        Long twitchViewers = preferred.twitchViewers();
        String logoUrl = preferred.logoUrl();
        String coverUrl = preferred.coverUrl();
        Integer userRating = preferred.userRating();
        Integer criticRating = preferred.criticRating();

        for (GameCatalogSearchResponse variant : variants) {
            if (steamAppId == null && variant.steamAppId() != null && variant.steamAppId() > 0) {
                steamAppId = variant.steamAppId();
            }

            livePlayers = maxNullable(livePlayers, variant.livePlayers());
            twitchViewers = maxNullable(twitchViewers, variant.twitchViewers());
            userRating = maxNullable(userRating, variant.userRating());
            criticRating = maxNullable(criticRating, variant.criticRating());

            if (isBlankAssetUrl(coverUrl) && !isBlankAssetUrl(variant.coverUrl())) {
                coverUrl = variant.coverUrl();
            }

            if (isBlankAssetUrl(logoUrl) && !isBlankAssetUrl(variant.logoUrl())) {
                logoUrl = variant.logoUrl();
            }
        }

        if (steamAppId == null) {
            steamAppId = resolveRegistrySteamAppId(preferred.slug());
        }

        return new GameCatalogSearchResponse(
                preferred.id(),
                preferred.slug(),
                preferred.gameName(),
                logoUrl,
                coverUrl,
                steamAppId,
                userRating,
                criticRating,
                preferred.genreName(),
                preferred.genreNames(),
                livePlayers,
                twitchViewers,
                preferred.upcomingRelease(),
                preferred.releaseDate()
        );
    }

    private static Integer resolveRegistrySteamAppId(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }

        return TrackedGameCatalog.findBySlug(slug)
                .map(TrackedGameCatalog.GameAssetMetadata::appId)
                .filter(appId -> appId != null && appId > 0)
                .or(() -> new KnownSteamAppRegistry().resolveAppId(slug))
                .orElse(null);
    }

    private static Long maxNullable(Long left, Long right) {
        if (left == null) {
            return right;
        }

        if (right == null) {
            return left;
        }

        return Math.max(left, right);
    }

    private static Integer maxNullable(Integer left, Integer right) {
        if (left == null) {
            return right;
        }

        if (right == null) {
            return left;
        }

        return Math.max(left, right);
    }

    private static boolean isBlankAssetUrl(String value) {
        return value == null
                || value.isBlank()
                || "none".equalsIgnoreCase(value.trim());
    }
}
