package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.entity.Game;
import com.statustimer.entity.GamePlatform;
import com.statustimer.entity.GamePlatformDetail;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class UpcomingReleaseServiceTest {

  @Test
  void keepsOnlyFutureDatedReleases() {
    LocalDate today = LocalDate.of(2026, 7, 8);

    Game upcoming = gameWithReleaseDate("upcoming-aaa-title", LocalDate.of(2026, 11, 19));
    Game recent = gameWithReleaseDate("fresh-launch", LocalDate.of(2026, 7, 3));
    Game stale = gameWithReleaseDate("old-launch", LocalDate.of(2026, 6, 20));

    assertThat(upcoming.isUpcomingRelease(today)).isTrue();
    assertThat(recent.isUpcomingRelease(today)).isFalse();
    assertThat(stale.isUpcomingRelease(today)).isFalse();
  }

  @Test
  void excludesReleasedCatalogGamesWhenIgdbDateIsKnown() {
    LocalDate today = LocalDate.of(2026, 7, 8);

    Game eldenRing = Game.builder()
        .slug("elden-ring")
        .gameName("Elden Ring")
        .steamAppId(1245620)
        .igdbFirstReleaseDate(LocalDate.of(2022, 2, 25))
        .build();

    assertThat(eldenRing.isUpcomingRelease(today)).isFalse();
  }

  @Test
  void excludesCatalogGamesWithoutReleaseSignals() {
    LocalDate today = LocalDate.of(2026, 7, 8);

    Game catalogOnly = Game.builder()
        .slug("elden-ring")
        .gameName("Elden Ring")
        .steamAppId(1245620)
        .build();

    assertThat(catalogOnly.isUpcomingRelease(today)).isFalse();
    assertThat(catalogOnly.hasUpcomingReleaseSignals()).isFalse();
  }

  @Test
  void keepsTbaReleasesWithPlatformTargetsOrHype() {
    LocalDate today = LocalDate.of(2026, 7, 8);

    Game tbaWithPlatforms = Game.builder()
        .slug("mystery-title")
        .gameName("Mystery Title")
        .build();
    tbaWithPlatforms.replacePlatforms(List.of(
        GamePlatformDetail.builder()
            .platform(GamePlatform.PC)
            .releaseDate(null)
            .build()
    ));

    Game tbaWithHype = Game.builder()
        .slug("hyped-title")
        .gameName("Hyped Title")
        .hypeCount(42L)
        .build();

    assertThat(tbaWithPlatforms.isUpcomingRelease(today)).isTrue();
    assertThat(tbaWithHype.isUpcomingRelease(today)).isTrue();
  }

  @Test
  void usesIgdbReleaseDateWhenPlatformDatesAreMissing() {
    LocalDate today = LocalDate.of(2026, 7, 8);

    Game futureIgdbRelease = Game.builder()
        .slug("future-igdb-title")
        .gameName("Future IGDB Title")
        .igdbFirstReleaseDate(LocalDate.of(2026, 12, 1))
        .build();

    Game pastIgdbRelease = Game.builder()
        .slug("elden-ring")
        .gameName("Elden Ring")
        .igdbFirstReleaseDate(LocalDate.of(2022, 2, 25))
        .build();

    assertThat(futureIgdbRelease.isUpcomingRelease(today)).isTrue();
    assertThat(pastIgdbRelease.isUpcomingRelease(today)).isFalse();
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
