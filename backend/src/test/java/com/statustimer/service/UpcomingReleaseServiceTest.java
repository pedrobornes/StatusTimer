package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.entity.Game;
import com.statustimer.entity.GamePlatform;
import com.statustimer.entity.GamePlatformDetail;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;

class UpcomingReleaseServiceTest {

    @Test
    void keepsUpcomingAndRecentlyReleasedGames() {
        LocalDateTime cutoff = LocalDate.of(2026, 7, 5).minusDays(7).atStartOfDay();

        Game upcoming = gameWithReleaseDate("upcoming-aaa-title", LocalDate.of(2026, 11, 19));
        Game recent = gameWithReleaseDate("fresh-launch", LocalDate.of(2026, 7, 3));
        Game stale = gameWithReleaseDate("old-launch", LocalDate.of(2026, 6, 20));

        assertThat(UpcomingReleaseService.isUpcomingOrRecentlyReleased(upcoming, cutoff)).isTrue();
        assertThat(UpcomingReleaseService.isUpcomingOrRecentlyReleased(recent, cutoff)).isTrue();
        assertThat(UpcomingReleaseService.isUpcomingOrRecentlyReleased(stale, cutoff)).isFalse();
    }

    @Test
    void keepsGamesWithoutConfirmedReleaseDates() {
        LocalDateTime cutoff = LocalDate.of(2026, 7, 5).minusDays(7).atStartOfDay();

        Game tba = Game.builder()
                .slug("mystery-title")
                .gameName("Mystery Title")
                .build();
        tba.replacePlatforms(List.of(
                GamePlatformDetail.builder()
                        .platform(GamePlatform.PC)
                        .releaseDate(null)
                        .build()
        ));

        assertThat(UpcomingReleaseService.isUpcomingOrRecentlyReleased(tba, cutoff)).isTrue();
    }

    private Game gameWithReleaseDate(String slug, LocalDate releaseDate) {
        Game game = Game.builder()
                .slug(slug)
                .gameName(slug)
                .build();
        game.replacePlatforms(List.of(
                GamePlatformDetail.builder()
                        .platform(GamePlatform.PC)
                        .releaseDate(releaseDate)
                        .build()
        ));
        return game;
    }
}
