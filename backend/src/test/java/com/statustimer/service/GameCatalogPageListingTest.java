package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.dto.response.GameCatalogPageResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GameCatalogPageListingTest {

    @Autowired
    private GameTelemetryService gameTelemetryService;

    @Autowired
    private GameRepository gameRepository;

    @Test
    void findCatalogPageExcludesUpcomingAndPrefersHigherTwitchViewers() {
        gameRepository.save(Game.builder()
                .slug("upcoming-test-game")
                .gameName("Upcoming Test Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamReleaseDate(LocalDate.now().plusMonths(2))
                .twitchRank(1)
                .twitchViewers(50_000L)
                .build());

        gameRepository.save(Game.builder()
                .slug("popular-live-game")
                .gameName("Popular Live Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamReleaseDate(LocalDate.now().minusYears(1))
                .twitchRank(2)
                .twitchViewers(120_000L)
                .steamReviewCount(500_000)
                .steamReviewScorePercent(90)
                .build());

        gameRepository.save(Game.builder()
                .slug("obscure-unranked-game")
                .gameName("Obscure Unranked Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamReleaseDate(LocalDate.now().minusYears(1))
                .build());

        GameCatalogPageResponse page = gameTelemetryService.findCatalogPage(0, 100, null, null);

        assertThat(page.items())
                .extracting(entry -> entry.gameSlug())
                .contains("popular-live-game")
                .doesNotContain("upcoming-test-game", "obscure-unranked-game");

        assertThat(page.items().getFirst().gameSlug()).isEqualTo("popular-live-game");
        assertThat(page.items().getFirst().twitchViewers()).isEqualTo(120_000L);
    }

    @Test
    void findCatalogGenresReturnsDistinctGenresFromEligibleCatalogRows() {
        gameRepository.save(Game.builder()
                .slug("shooter-live-game")
                .gameName("Shooter Live Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamReleaseDate(LocalDate.now().minusYears(1))
                .twitchRank(3)
                .genreName("Shooter")
                .build());

        gameRepository.save(Game.builder()
                .slug("arcade-live-game")
                .gameName("Arcade Live Game")
                .lifecycleState(LifecycleState.CATALOG)
                .steamReleaseDate(LocalDate.now().minusYears(1))
                .twitchRank(4)
                .genreName("Arcade")
                .build());

        assertThat(gameTelemetryService.findCatalogGenres())
                .contains("Shooter", "Arcade");
    }
}
