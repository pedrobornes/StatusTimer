package com.statustimer.config;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Blocks adult / sexually explicit Steam and catalog titles from search, listings,
 * releases, and SEO surfacing.
 */
public final class CatalogMatureContentPolicy {

    /**
     * Steam content descriptor IDs for sexually explicit storefront listings only.
     * <ul>
     *   <li>1 — some nudity / sexual themes (GTA, Cyberpunk, etc.)</li>
     *   <li>2 — frequent violence or gore</li>
     *   <li>3 — adult-only sexual content</li>
     *   <li>4 — frequent nudity or sexual content</li>
     *   <li>5 — any mature content (baseline ESRB M rating)</li>
     * </ul>
     */
    private static final Set<Integer> STEAM_EXPLICIT_SEXUAL_DESCRIPTOR_IDS = Set.of(3, 4);

    private static final Set<String> ALLOWED_LABEL_EXCEPTIONS = Set.of(
            "non-sexual nudity"
    );

    private static final Set<String> EXPLICIT_MATURE_LABELS = Set.of(
            "erotic",
            "sexual content",
            "sexual themes",
            "nudity",
            "hentai",
            "adult only",
            "pornographic",
            "nsfw",
            "xxx",
            "mature content"
    );

    private static final Set<String> BANNED_WHOLE_WORDS = Set.of(
            "gay",
            "sex",
            "porn",
            "hentai",
            "xxx",
            "nsfw",
            "nude",
            "erotic"
    );

    private static final Pattern SEXUAL_SLUG_PREFIX = Pattern.compile(
            "^(?:sex|porn|hentai|xxx|nsfw)(?:[0-9]+|-|$)",
            Pattern.CASE_INSENSITIVE
    );

    private static final List<Pattern> BANNED_WHOLE_WORD_PATTERNS = BANNED_WHOLE_WORDS.stream()
            .map(word -> Pattern.compile("\\b" + Pattern.quote(word) + "\\b", Pattern.CASE_INSENSITIVE))
            .toList();

    private CatalogMatureContentPolicy() {
    }

    public static boolean containsBannedWord(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        String normalized = value.trim();
        if (BANNED_WHOLE_WORD_PATTERNS.stream().anyMatch(pattern -> pattern.matcher(normalized).find())) {
            return true;
        }

        return SEXUAL_SLUG_PREFIX.matcher(normalized).find();
    }

    public static boolean containsMatureLabel(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (ALLOWED_LABEL_EXCEPTIONS.contains(normalized)) {
            return false;
        }

        if ("adult".equals(normalized)) {
            return true;
        }

        return EXPLICIT_MATURE_LABELS.stream().anyMatch(normalized::equals);
    }

    public static boolean hasMatureLabels(List<String> labels) {
        if (labels == null || labels.isEmpty()) {
            return false;
        }

        return labels.stream().anyMatch(CatalogMatureContentPolicy::containsMatureLabel);
    }

    /**
     * Steam storefront flag for pornographic / adult-only listings.
     * Ignores general mature ratings, violence, drugs, and incidental nudity.
     */
    public static boolean isSteamExplicitSexualListing(java.util.Collection<Integer> descriptorIds) {
        if (descriptorIds == null || descriptorIds.isEmpty()) {
            return false;
        }

        return descriptorIds.stream().anyMatch(STEAM_EXPLICIT_SEXUAL_DESCRIPTOR_IDS::contains);
    }

    public static boolean isMatureIgdbMatch(IgdbGameMatch match) {
        if (match == null) {
            return false;
        }

        if (containsBannedWord(match.igdbSlug()) || containsBannedWord(match.name())) {
            return true;
        }

        return hasMatureLabels(match.genreNames()) || hasMatureLabels(match.themeNames());
    }

    public static boolean isMatureGame(Game game) {
        if (game == null) {
            return false;
        }

        if (containsBannedWord(game.getSlug()) || containsBannedWord(game.getGameName())) {
            return true;
        }

        if (hasMatureLabels(game.getGenreNames())) {
            return true;
        }

        if (Boolean.TRUE.equals(game.getSteamAdultContent())) {
            return true;
        }

        return containsMatureLabel(game.getGenreName());
    }

    public static boolean shouldSkipCatalogSurfacing(Game game) {
        return isMatureGame(game) || CatalogDiscoveryPolicy.shouldSkipCatalogSurfacing(game);
    }

    /**
     * @return true when the game is quarantined (already or newly)
     */
    public static boolean applyQuarantineIfMature(Game game) {
        if (game == null) {
            return false;
        }

        if (isMatureGame(game)) {
            game.setStaleReason(IndexabilityProperties.STALE_REASON_MATURE_CONTENT);
            game.setIsIndexable(false);
            if (game.getLifecycleState() == null) {
                game.setLifecycleState(LifecycleState.CATALOG);
            }
            return true;
        }

        if (IndexabilityProperties.STALE_REASON_MATURE_CONTENT.equals(game.getStaleReason())) {
            game.setStaleReason(null);
        }

        return false;
    }
}
