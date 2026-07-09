package com.statustimer.config;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Blocks adult / sexually explicit Steam and catalog titles from search, listings,
 * releases, and SEO surfacing.
 */
public final class CatalogMatureContentPolicy {

    private static final Set<String> MATURE_LABEL_KEYWORDS = Set.of(
            "erotic",
            "sexual",
            "nudity",
            "hentai",
            "adult only",
            "pornographic",
            "nsfw",
            "xxx",
            "mature content"
    );

    private CatalogMatureContentPolicy() {
    }

    public static boolean containsMatureLabel(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if ("adult".equals(normalized)) {
            return true;
        }

        return MATURE_LABEL_KEYWORDS.stream().anyMatch(normalized::contains);
    }

    public static boolean hasMatureLabels(List<String> labels) {
        if (labels == null || labels.isEmpty()) {
            return false;
        }

        return labels.stream().anyMatch(CatalogMatureContentPolicy::containsMatureLabel);
    }

    public static boolean isMatureIgdbMatch(IgdbGameMatch match) {
        if (match == null) {
            return false;
        }

        return hasMatureLabels(match.genreNames()) || hasMatureLabels(match.themeNames());
    }

    public static boolean shouldSkipCatalogSurfacing(Game game) {
        if (game == null) {
            return false;
        }

        if (Boolean.TRUE.equals(game.getSteamAdultContent())) {
            return true;
        }

        if (IndexabilityProperties.STALE_REASON_MATURE_CONTENT.equals(game.getStaleReason())) {
            return true;
        }

        return containsMatureLabel(game.getGenreName());
    }

    /**
     * @return true when the game is quarantined (already or newly)
     */
    public static boolean applyQuarantineIfMature(Game game) {
        if (game == null || !shouldSkipCatalogSurfacing(game)) {
            return false;
        }

        game.setStaleReason(IndexabilityProperties.STALE_REASON_MATURE_CONTENT);
        game.setIsIndexable(false);
        if (game.getLifecycleState() == null) {
            game.setLifecycleState(LifecycleState.CATALOG);
        }

        return true;
    }
}
