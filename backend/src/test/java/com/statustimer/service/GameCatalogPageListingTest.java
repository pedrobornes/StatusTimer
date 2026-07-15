package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.config.CacheConfig;
import com.statustimer.dto.response.GameCatalogPageResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GamePlatformDetail;
import com.statustimer.entity.GamePlatform;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cache.CacheManager;
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

    @Autowired
    private CacheManager cacheManager;

    @BeforeEach
    void clearCatalogGenreCache() {
        var cache = cacheManager.getCache(CacheConfig.PUBLIC_READ_MEDIUM_CACHE);
        if (cache != null) {
            cache.evict("catalogGenres");
        }
    }

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
    void findCatalogPageExcludesUpcomingTitlesWithPlatformTargetsOnly() {
        Game upcoming = gameRepository.save(Game.builder()
                .slug("deadlock-style-upcoming")
                .gameName("Deadlock Style Upcoming")
                .lifecycleState(LifecycleState.CATALOG)
                .twitchRank(4)
                .twitchViewers(40_000L)
                .build());

        upcoming.replacePlatforms(java.util.List.of(
                GamePlatformDetail.builder()
                        .game(upcoming)
                        .platform(GamePlatform.PC)
                        .releaseDate(null)
                        .build()
        ));
        gameRepository.save(upcoming);

        GameCatalogPageResponse page = gameTelemetryService.findCatalogPage(0, 100, null, null);

        assertThat(page.items())
                .extracting(entry -> entry.gameSlug())
                .doesNotContain("deadlock-style-upcoming");
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
