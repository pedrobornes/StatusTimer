package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.dto.request.CreateGamingNewsRequest;
import com.statustimer.entity.Game;
import com.statustimer.entity.GamingNews;
import com.statustimer.entity.GamingNewsSlugAlias;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GamingNewsRepository;
import com.statustimer.repository.GamingNewsSlugAliasRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

@ExtendWith(MockitoExtension.class)
class GamingNewsServiceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 7, 9, 12, 0);

    @Mock
    private GamingNewsRepository gamingNewsRepository;

    @Mock
    private GamingNewsSlugAliasRepository gamingNewsSlugAliasRepository;

    @Mock
    private GameRepository gameRepository;

    @Mock
    private GameCatalogService gameCatalogService;

    private GamingNewsService gamingNewsService;

    @BeforeEach
    void setUp() {
        gamingNewsService = new GamingNewsService(
                gamingNewsRepository,
                gamingNewsSlugAliasRepository,
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

    @Test
    void findByGameTagDeduplicatesArticlesWithSameTitle() {
        Game palworld = Game.builder().slug("palworld").gameName("Palworld").build();
        GamingNews first = GamingNews.builder()
                .id(1L)
                .title("1.0 Official Launch Trailer is OUT!!")
                .content("First copy")
                .newsSlug("palworld-10-official-launch-trailer-is-out")
                .game(palworld)
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();
        GamingNews duplicate = GamingNews.builder()
                .id(2L)
                .title("1.0 Official Launch Trailer is OUT!")
                .content("Second copy")
                .newsSlug("palworld-10-official-launch-trailer-is-out-2")
                .game(palworld)
                .createdAt(NOW.minusHours(1))
                .publishedAt(NOW.minusHours(1))
                .build();

        when(gamingNewsRepository.findAllForGameSlug("palworld", "palworld", Pageable.unpaged()))
                .thenReturn(List.of(first, duplicate));
        when(gameCatalogService.resolveGameName("palworld")).thenReturn("Palworld");
        when(gameCatalogService.resolveCoverUrl("palworld", null)).thenReturn(null);

        var results = gamingNewsService.findByGameTag("palworld", 10);

        assertThat(results).hasSize(1);
        assertThat(results.getFirst().slug()).isEqualTo("palworld-10-official-launch-trailer-is-out");
    }

    @Test
    void createReturnsExistingArticleInsteadOfInsertingDuplicate() {
        Game palworld = Game.builder().slug("palworld").gameName("Palworld").build();
        GamingNews existing = GamingNews.builder()
                .id(9L)
                .title("Important: About MODs and 1.0!!")
                .content("Existing copy")
                .newsSlug("palworld-important-about-mods-and-10")
                .game(palworld)
                .gameTag("palworld")
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();

        when(gamingNewsRepository.findAllForGameSlug("palworld", "palworld", Pageable.unpaged()))
                .thenReturn(List.of(existing));
        when(gameCatalogService.resolveGameName("palworld")).thenReturn("Palworld");
        when(gameCatalogService.resolveCoverUrl("palworld", null)).thenReturn(null);
        when(gamingNewsRepository.save(any(GamingNews.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = gamingNewsService.create(new CreateGamingNewsRequest(
                "Important: About MODs and 1.0!",
                "New ingest attempt",
                "palworld",
                NOW
        ));

        assertThat(response.id()).isEqualTo(9L);
        assertThat(response.content()).isEqualTo("New ingest attempt");
        verify(gamingNewsRepository).save(existing);
    }

    @Test
    void createSkipsSaveWhenDuplicateContentIsUnchanged() {
        Game palworld = Game.builder().slug("palworld").gameName("Palworld").build();
        GamingNews existing = GamingNews.builder()
                .id(9L)
                .title("Important: About MODs and 1.0!!")
                .content("Same copy")
                .newsSlug("palworld-important-about-mods-and-10")
                .game(palworld)
                .gameTag("palworld")
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();

        when(gamingNewsRepository.findAllForGameSlug("palworld", "palworld", Pageable.unpaged()))
                .thenReturn(List.of(existing));
        when(gameCatalogService.resolveGameName("palworld")).thenReturn("Palworld");
        when(gameCatalogService.resolveCoverUrl("palworld", null)).thenReturn(null);

        var response = gamingNewsService.create(new CreateGamingNewsRequest(
                "Important: About MODs and 1.0!",
                "Same copy",
                "palworld",
                NOW
        ));

        assertThat(response.id()).isEqualTo(9L);
        verify(gamingNewsRepository, never()).save(any(GamingNews.class));
    }

    @Test
    void createReturnsExistingArticleWhenBaseSlugAlreadyTakenBySameStory() {
        Game tft = Game.builder().slug("teamfight-tactics").gameName("Teamfight Tactics").build();
        GamingNews existing = GamingNews.builder()
                .id(11L)
                .title("Space Gods Tactician's Crown Primer")
                .content("Existing copy")
                .newsSlug("teamfight-tactics-space-gods-tactician-s-crown-primer")
                .game(tft)
                .gameTag("teamfight-tactics")
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();

        when(gamingNewsRepository.findAllForGameSlug(
                "teamfight-tactics",
                "teamfight-tactics",
                Pageable.unpaged()
        )).thenReturn(List.of());
        when(gamingNewsRepository.findByNewsSlug("teamfight-tactics-space-gods-tactician-s-crown-primer"))
                .thenReturn(java.util.Optional.of(existing));
        when(gameCatalogService.resolveGameName("teamfight-tactics")).thenReturn("Teamfight Tactics");
        when(gameCatalogService.resolveCoverUrl("teamfight-tactics", null)).thenReturn(null);
        when(gamingNewsRepository.save(any(GamingNews.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = gamingNewsService.create(new CreateGamingNewsRequest(
                "Space Gods Tactician's Crown Primer",
                "Re-ingest attempt",
                "teamfight-tactics",
                NOW
        ));

        assertThat(response.id()).isEqualTo(11L);
        assertThat(response.slug())
                .isEqualTo("teamfight-tactics-space-gods-tactician-s-crown-primer");
        assertThat(response.content()).isEqualTo("Re-ingest attempt");
        verify(gamingNewsRepository).save(existing);
        verify(gamingNewsRepository, never()).existsByNewsSlug(any());
    }

    @Test
    void createUsesSuffixWhenBaseSlugTakenByDifferentStory() {
        Game wow = Game.builder().slug("world-of-warcraft").gameName("World of Warcraft").build();
        GamingNews differentStory = GamingNews.builder()
                .id(20L)
                .title("Weekly Reset Reminder")
                .content("Other story")
                .newsSlug("world-of-warcraft-hotfixes-july-7-2026")
                .game(wow)
                .gameTag("world-of-warcraft")
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();

        when(gamingNewsRepository.findAllForGameSlug(
                "world-of-warcraft",
                "world-of-warcraft",
                Pageable.unpaged()
        )).thenReturn(List.of());
        when(gamingNewsRepository.findByNewsSlug("world-of-warcraft-hotfixes-july-7-2026"))
                .thenReturn(java.util.Optional.of(differentStory));
        when(gamingNewsRepository.existsByNewsSlug("world-of-warcraft-hotfixes-july-7-2026"))
                .thenReturn(true);
        when(gamingNewsRepository.existsByNewsSlug("world-of-warcraft-hotfixes-july-7-2026-2"))
                .thenReturn(false);
        when(gamingNewsSlugAliasRepository.existsByAliasSlug("world-of-warcraft-hotfixes-july-7-2026-2"))
                .thenReturn(false);
        when(gameRepository.findBySlug("world-of-warcraft")).thenReturn(java.util.Optional.of(wow));
        when(gameCatalogService.resolveGameName("world-of-warcraft")).thenReturn("World of Warcraft");
        when(gameCatalogService.resolveCoverUrl("world-of-warcraft", null)).thenReturn(null);
        when(gamingNewsRepository.save(any(GamingNews.class))).thenAnswer(invocation -> {
            GamingNews saved = invocation.getArgument(0);
            saved.setId(21L);
            return saved;
        });

        var response = gamingNewsService.create(new CreateGamingNewsRequest(
                "Hotfixes: July 7, 2026",
                "Patch details",
                "world-of-warcraft",
                NOW
        ));

        assertThat(response.slug()).isEqualTo("world-of-warcraft-hotfixes-july-7-2026-2");
        verify(gamingNewsRepository).save(any(GamingNews.class));
    }

    @Test
    void reconcileDuplicateNewsDeletesExtraRowsAndRegistersAlias() {
        Game palworld = Game.builder().slug("palworld").gameName("Palworld").build();
        GamingNews keeper = GamingNews.builder()
                .id(1L)
                .title("Patch update")
                .content("Keeper")
                .newsSlug("palworld-patch-update")
                .game(palworld)
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();
        GamingNews duplicate = GamingNews.builder()
                .id(2L)
                .title("Patch update")
                .content("Duplicate")
                .newsSlug("palworld-patch-update-2")
                .game(palworld)
                .createdAt(NOW.minusHours(2))
                .publishedAt(NOW.minusHours(2))
                .build();

        when(gamingNewsRepository.findAllByOrderByCreatedAtDesc())
                .thenReturn(List.of(keeper, duplicate));
        when(gamingNewsRepository.existsByNewsSlug("palworld-patch-update-2")).thenReturn(false);
        when(gamingNewsSlugAliasRepository.findByAliasSlugWithNews("palworld-patch-update-2"))
                .thenReturn(Optional.empty());
        when(gamingNewsSlugAliasRepository.findByNews_Id(2L)).thenReturn(List.of());
        when(gamingNewsSlugAliasRepository.save(any(GamingNewsSlugAlias.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        int removed = gamingNewsService.reconcileDuplicateNews();

        assertThat(removed).isEqualTo(1);
        ArgumentCaptor<GamingNewsSlugAlias> aliasCaptor =
                ArgumentCaptor.forClass(GamingNewsSlugAlias.class);
        verify(gamingNewsSlugAliasRepository).save(aliasCaptor.capture());
        assertThat(aliasCaptor.getValue().getAliasSlug()).isEqualTo("palworld-patch-update-2");
        assertThat(aliasCaptor.getValue().getNews().getId()).isEqualTo(1L);
        verify(gamingNewsRepository).deleteAll(List.of(duplicate));
    }

    @Test
    void findBySlugResolvesRegisteredAliasToCanonicalArticle() {
        Game palworld = Game.builder().slug("palworld").gameName("Palworld").build();
        GamingNews keeper = GamingNews.builder()
                .id(1L)
                .title("Patch update")
                .content("Keeper")
                .newsSlug("palworld-patch-update")
                .game(palworld)
                .gameTag("palworld")
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();
        GamingNewsSlugAlias alias = GamingNewsSlugAlias.builder()
                .id(10L)
                .aliasSlug("palworld-patch-update-2")
                .news(keeper)
                .createdAt(NOW)
                .build();

        when(gamingNewsRepository.findByNewsSlug("palworld-patch-update-2"))
                .thenReturn(Optional.empty());
        when(gamingNewsSlugAliasRepository.findByAliasSlugWithNews("palworld-patch-update-2"))
                .thenReturn(Optional.of(alias));
        when(gameCatalogService.resolveGameName("palworld")).thenReturn("Palworld");
        when(gameCatalogService.resolveCoverUrl("palworld", null)).thenReturn(null);

        var response = gamingNewsService.findBySlug("palworld-patch-update-2");

        assertThat(response.slug()).isEqualTo("palworld-patch-update");
        assertThat(response.id()).isEqualTo(1L);
    }

    @Test
    void findBySlugFallsBackToBaseSlugWhenRetiredSuffixHasNoAlias() {
        Game rust = Game.builder().slug("rust").gameName("Rust").build();
        GamingNews keeper = GamingNews.builder()
                .id(3L)
                .title("Common Ground")
                .content("Body")
                .newsSlug("rust-common-ground")
                .game(rust)
                .gameTag("rust")
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();

        when(gamingNewsRepository.findByNewsSlug("rust-common-ground-2"))
                .thenReturn(Optional.empty());
        when(gamingNewsSlugAliasRepository.findByAliasSlugWithNews("rust-common-ground-2"))
                .thenReturn(Optional.empty());
        when(gamingNewsRepository.findByNewsSlug("rust-common-ground"))
                .thenReturn(Optional.of(keeper));
        when(gameCatalogService.resolveGameName("rust")).thenReturn("Rust");
        when(gameCatalogService.resolveCoverUrl("rust", null)).thenReturn(null);

        var response = gamingNewsService.findBySlug("rust-common-ground-2");

        assertThat(response.slug()).isEqualTo("rust-common-ground");
    }

    @Test
    void findBySlugKeepsLiveFarCryStylePrimarySlug() {
        Game wot = Game.builder().slug("world-of-tanks").gameName("World of Tanks").build();
        GamingNews farCryCrossover = GamingNews.builder()
                .id(4L)
                .title("Battle Pass Special: Far Cry 2")
                .content("Body")
                .newsSlug("world-of-tanks-battle-pass-special-far-cry-2")
                .game(wot)
                .gameTag("world-of-tanks")
                .createdAt(NOW)
                .publishedAt(NOW)
                .build();

        when(gamingNewsRepository.findByNewsSlug("world-of-tanks-battle-pass-special-far-cry-2"))
                .thenReturn(Optional.of(farCryCrossover));
        when(gameCatalogService.resolveGameName("world-of-tanks")).thenReturn("World of Tanks");
        when(gameCatalogService.resolveCoverUrl("world-of-tanks", null)).thenReturn(null);

        var response = gamingNewsService.findBySlug(
                "world-of-tanks-battle-pass-special-far-cry-2"
        );

        assertThat(response.slug()).isEqualTo("world-of-tanks-battle-pass-special-far-cry-2");
        verify(gamingNewsSlugAliasRepository, never()).findByAliasSlugWithNews(any());
    }
}
