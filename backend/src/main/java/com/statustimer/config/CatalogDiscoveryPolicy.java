package com.statustimer.config;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Blocks IGDB discovery noise that is not a monitorable live-service game
 * (visual novels, interactive fiction spam, etc.).
 */
public final class CatalogDiscoveryPolicy {

    private static final Set<String> EXCLUDED_GENRE_LABELS = Set.of(
            "visual novel",
            "interactive fiction"
    );

    private CatalogDiscoveryPolicy() {
    }

    public static boolean hasExcludedGenre(List<String> genreNames) {
        if (genreNames == null || genreNames.isEmpty()) {
            return false;
        }

        return genreNames.stream()
                .map(CatalogDiscoveryPolicy::normalizeLabel)
                .anyMatch(EXCLUDED_GENRE_LABELS::contains);
    }

    public static boolean hasExcludedGenre(Game game) {
        if (game == null) {
            return false;
        }

        if (hasExcludedGenre(game.getGenreNames())) {
            return true;
        }

        String genreName = game.getGenreName();
        return genreName != null
                && !genreName.isBlank()
                && EXCLUDED_GENRE_LABELS.contains(normalizeLabel(genreName));
    }

    public static boolean isExcludedIgdbMatch(IgdbGameMatch match) {
        if (match == null) {
            return false;
        }

        if (hasExcludedGenre(match.genreNames())) {
            return true;
        }

        return CatalogMatureContentPolicy.isMatureIgdbMatch(match);
    }

    public static boolean shouldSkipCatalogSurfacing(Game game) {
        return hasExcludedGenre(game);
    }

    /**
     * @return true when the game is quarantined (already or newly)
     */
    public static boolean applyQuarantineIfExcluded(Game game) {
        if (game == null || !shouldSkipCatalogSurfacing(game)) {
            return false;
        }

        game.setStaleReason(IndexabilityProperties.STALE_REASON_EXCLUDED_CATALOG_PROFILE);
        game.setIsIndexable(false);
        if (game.getLifecycleState() == null) {
            game.setLifecycleState(LifecycleState.CATALOG);
        }

        return true;
    }

    private static String normalizeLabel(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
