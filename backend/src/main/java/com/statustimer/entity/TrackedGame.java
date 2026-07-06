package com.statustimer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(
        name = "tracked_games",
        indexes = {
                @Index(name = "idx_tracked_games_lifecycle", columnList = "lifecycle_state"),
                @Index(name = "idx_tracked_games_indexable", columnList = "is_indexable")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackedGame {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(nullable = false)
    private String gameName;

    @Column(name = "steam_app_id")
    private Integer steamAppId;

    @Column(name = "logo_url", length = 2048)
    private String logoUrl;

    @Column(name = "cover_url", length = 2048)
    private String coverUrl;

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
    private java.time.LocalDate steamReleaseDate;

    @Column(name = "steam_adult_content", nullable = false)
    @Builder.Default
    private Boolean steamAdultContent = false;

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
}
