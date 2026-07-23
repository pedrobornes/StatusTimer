package com.statustimer.entity;

import com.statustimer.util.StringListJsonConverter;
import com.statustimer.util.StringMapJsonConverter;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Convert;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Formula;

@Entity
@Table(
        name = "games",
        indexes = {
                @Index(name = "idx_games_lifecycle", columnList = "lifecycle_state"),
                @Index(name = "idx_games_indexable", columnList = "is_indexable"),
                @Index(name = "idx_games_steam_app_id", columnList = "steam_app_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String gameName;

    @Column(name = "genre_name", length = 128)
    private String genreName;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "genre_names_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> genreNames = new ArrayList<>();

    @Formula("genre_names_json")
    private String genreNamesJsonBlob;

    @Column(nullable = false)
    @Builder.Default
    private Long hypeCount = 0L;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "logo_url", length = 2048)
    private String logoUrl;

    @Column(name = "cover_url", length = 2048)
    private String coverUrl;

    @Column(name = "steam_app_id")
    private Integer steamAppId;

    @Column(nullable = false)
    @Builder.Default
    private Boolean featured = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean manualLock = false;

    @Column(name = "twitch_game_id", length = 64)
    private String twitchGameId;

    @Column(name = "twitch_rank")
    private Integer twitchRank;

    @Column(name = "steam_release_date")
    private LocalDate steamReleaseDate;

    @Column(name = "igdb_first_release_date")
    private LocalDate igdbFirstReleaseDate;

    @Column(name = "steam_adult_content", nullable = false)
    @Builder.Default
    private Boolean steamAdultContent = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false)
    @Builder.Default
    private GameType gameType = GameType.MULTIPLAYER;

    @Column(name = "steam_short_description", columnDefinition = "TEXT")
    private String steamShortDescription;

    @Column(name = "steam_price_final")
    private Integer steamPriceFinal;

    @Column(name = "steam_currency", length = 8)
    private String steamCurrency;

    @Column(name = "steam_windows", nullable = false)
    @Builder.Default
    private Boolean steamWindows = false;

    @Column(name = "steam_mac", nullable = false)
    @Builder.Default
    private Boolean steamMac = false;

    @Column(name = "steam_linux", nullable = false)
    @Builder.Default
    private Boolean steamLinux = false;

    @Column(name = "steam_free_to_play", nullable = false)
    @Builder.Default
    private Boolean steamFreeToPlay = false;

    @Column(name = "live_players")
    private Long livePlayers;

    @Column(name = "twitch_viewers")
    private Long twitchViewers;

    @Enumerated(EnumType.STRING)
    @Column(name = "lifecycle_state", nullable = false)
    @Builder.Default
    private LifecycleState lifecycleState = LifecycleState.CATALOG;

    @Column(name = "scrape_tier", nullable = false)
    @Builder.Default
    private Integer scrapeTier = 3;

    @Column(name = "next_telemetry_at")
    private LocalDateTime nextTelemetryAt;

    @Column(name = "next_news_at")
    private LocalDateTime nextNewsAt;

    @Column(name = "next_metrics_at")
    private LocalDateTime nextMetricsAt;

    @Column(name = "last_telemetry_at")
    private LocalDateTime lastTelemetryAt;

    @Column(name = "last_news_at")
    private LocalDateTime lastNewsAt;

    @Column(name = "first_monitored_at")
    private LocalDateTime firstMonitoredAt;

    @Column(name = "is_indexable", nullable = false)
    @Builder.Default
    private Boolean isIndexable = false;

    @Column(name = "initial_telemetry_ready", nullable = false)
    @Builder.Default
    private Boolean initialTelemetryReady = false;

    @Column(name = "stale_reason", length = 64)
    private String staleReason;

    @Column(name = "igdb_game_id")
    private Long igdbGameId;

    @Column(name = "user_rating")
    private Integer userRating;

    @Column(name = "critic_rating")
    private Integer criticRating;

    @Column(name = "steam_review_count")
    private Integer steamReviewCount;

    @Column(name = "steam_review_score_percent")
    private Integer steamReviewScorePercent;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "screenshot_urls_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> screenshotUrls = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "trailer_video_ids_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> trailerVideoIds = new ArrayList<>();

    @Column(name = "youtube_channel_url", length = 2048)
    private String youtubeChannelUrl;

    @Convert(converter = StringMapJsonConverter.class)
    @Column(name = "external_links_json", columnDefinition = "TEXT")
    @Builder.Default
    private Map<String, String> externalLinks = new HashMap<>();

    @Column(name = "steam_consecutive_404_count", nullable = false)
    @Builder.Default
    private Integer steamConsecutive404Count = 0;

    @Column(name = "steam_blacklisted", nullable = false)
    @Builder.Default
    private Boolean steamBlacklisted = false;

    @Column(name = "steam_blacklist_rescan_at")
    private LocalDateTime steamBlacklistRescanAt;

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<GamePlatformDetail> platforms = new ArrayList<>();

    public void replacePlatforms(List<GamePlatformDetail> nextPlatforms) {
        platforms.clear();
        for (GamePlatformDetail platformDetail : nextPlatforms) {
            platformDetail.setGame(this);
            platforms.add(platformDetail);
        }
    }

    public Optional<LocalDate> resolveEarliestKnownReleaseDate() {
        Optional<LocalDate> platformReleaseDate = platforms.stream()
                .map(GamePlatformDetail::getReleaseDate)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder());

        if (platformReleaseDate.isPresent()) {
            return platformReleaseDate;
        }

        if (igdbFirstReleaseDate != null) {
            return Optional.of(igdbFirstReleaseDate);
        }

        if (steamReleaseDate != null) {
            return Optional.of(steamReleaseDate);
        }

        return Optional.empty();
    }

    public boolean isUpcomingRelease(LocalDate today) {
        Optional<LocalDate> knownReleaseDate = resolveEarliestKnownReleaseDate();
        if (knownReleaseDate.isPresent()) {
            return knownReleaseDate.get().isAfter(today);
        }

        return hasUpcomingReleaseSignals();
    }

    /**
     * Titles that should use a release profile (including undated IGDB TBA
     * announcements that lack hype/platform seed signals yet). Not used for the
     * public /releases index — only for by-slug lookup and status routing.
     */
    public boolean isReleaseProfileCandidate(LocalDate today) {
        if (isUpcomingRelease(today)) {
            return true;
        }

        return igdbGameId != null && resolveEarliestKnownReleaseDate().isEmpty();
    }

    public boolean hasUpcomingReleaseSignals() {
        boolean hasPlatformTargets = !platforms.isEmpty();
        boolean hasHype = hypeCount != null && hypeCount > 0L;
        return hasPlatformTargets || hasHype;
    }

    public LocalDateTime resolvePrimaryReleaseDate() {
        return resolveEarliestKnownReleaseDate()
                .map(LocalDate::atStartOfDay)
                .orElse(null);
    }
}
