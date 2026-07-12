package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.statustimer.entity.Game;
import com.statustimer.entity.GamingNews;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GamingNewsRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GamingNewsServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 9, 12, 0);

    @Mock
    private GamingNewsRepository gamingNewsRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameCatalogService gameCatalogService;

    private GamingNewsService gamingNewsService;

    @BeforeEach
    void setUp() {
        gamingNewsService = new GamingNewsService(
                gamingNewsRepository,
                gameRepository,
                gameCatalogService
        );
    }

    @Test
    void findLatestWithTierFiltersNewsToMatchingGames() {
        Game valorant = Game.builder().slug("valorant").gameName("Valorant").build();
        Game fortnite = Game.builder().slug("fortnite").gameName("Fortnite").build();

        GamingNews tierOneNews = GamingNews.builder()
                .id(1L)
                .title("Valorant patch notes")
                .content("Patch details")
                .game(valorant)
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();
        GamingNews tierTwoNews = GamingNews.builder()
                .id(2L)
                .title("Indie game update")
                .content("Update details")
                .gameTag("indie-game")
                .createdAt(NOW.minusHours(1))
                .publishedAt(NOW.minusHours(1))
                .build();
        GamingNews tierOneByTag = GamingNews.builder()
                .id(3L)
                .title("Fortnite event")
                .content("Event details")
                .gameTag("fortnite")
                .createdAt(NOW.minusHours(2))
                .publishedAt(NOW.minusHours(2))
                .build();

        when(gameRepository.findSlugsByScrapeTier(1))
                .thenReturn(List.of("valorant", "fortnite"));
        when(gamingNewsRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(tierOneNews, tierTwoNews, tierOneByTag));
        when(gameCatalogService.resolveGameName("valorant")).thenReturn("Valorant");
        when(gameCatalogService.resolveGameName("fortnite")).thenReturn("Fortnite");
        when(gameCatalogService.resolveCoverUrl("valorant", null)).thenReturn(null);
        when(gameCatalogService.resolveCoverUrl("fortnite", null)).thenReturn(null);

        var results = gamingNewsService.findLatest(1);

        assertThat(results).hasSize(2);
        assertThat(results).extracting(item -> item.gameTag())
                .containsExactly("valorant", "fortnite");
    }
}
