package com.statustimer.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "tracked_games")
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
}
