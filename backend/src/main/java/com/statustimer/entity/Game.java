package com.statustimer.entity;

import com.statustimer.util.StringListJsonConverter;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Convert;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "games")
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GameGenre genre;

    @Column(nullable = false)
    @Builder.Default
    private Long hypeCount = 0L;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "logo_url", length = 2048)
    private String logoUrl;

    @Column(name = "igdb_game_id")
    private Long igdbGameId;

    @Column(name = "user_rating")
    private Integer userRating;

    @Column(name = "critic_rating")
    private Integer criticRating;

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "themes_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> themes = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "screenshot_urls_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> screenshotUrls = new ArrayList<>();

    @Convert(converter = StringListJsonConverter.class)
    @Column(name = "trailer_video_ids_json", columnDefinition = "TEXT")
    @Builder.Default
    private List<String> trailerVideoIds = new ArrayList<>();

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

    public LocalDateTime resolvePrimaryReleaseDate() {
        return platforms.stream()
                .map(GamePlatformDetail::getReleaseDate)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .map(LocalDate::atStartOfDay)
                .orElse(LocalDateTime.of(2099, 12, 31, 0, 0));
    }
}
