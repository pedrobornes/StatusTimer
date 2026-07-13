package com.statustimer.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;

import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GamePlatform;
import com.statustimer.entity.GamePlatformDetail;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import com.statustimer.repository.GameRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GameCatalogServiceSearchTest {

    @Autowired
    private GameCatalogService gameCatalogService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @MockitoBean
    private IgdbSearchClient igdbSearchClient;

    @BeforeEach
    void seedLocalMatch() {
        when(igdbSearchClient.isConfigured()).thenReturn(true);

        gameRepository.save(Game.builder()
                .slug("grand-theft-auto-vi")
                .gameName("Grand Theft Auto VI")
                .lifecycleState(LifecycleState.CATALOG)
                .build());
    }

    @Test
    void searchReturnsLocalMatchesWhenIgdbDiscoveryFails() {
        when(igdbSearchClient.search(anyString(), anyInt()))
                .thenThrow(new IllegalStateException("IGDB unavailable"));

        List<GameCatalogSearchResponse> results = gameCatalogService.search("grand");

        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(result -> "grand-theft-auto-vi".equals(result.slug())));
    }

    @Test
    void searchSkipsInvalidIgdbMatchAndKeepsOtherResults() {
        IgdbGameMatch invalidMatch = new IgdbGameMatch(
                999L,
                "",
                "broken-match",
                null,
                null,
                null,
                null,
                null,
                List.of(),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );
        IgdbGameMatch validMatch = new IgdbGameMatch(
                1000L,
                "GTA VI Collector",
                "gta-vi-collector",
                null,
                null,
                null,
                null,
                null,
                List.of("Shooter"),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        when(igdbSearchClient.search(anyString(), anyInt()))
                .thenReturn(List.of(invalidMatch, validMatch));

        List<GameCatalogSearchResponse> results = gameCatalogService.search("collector");

        assertTrue(results.stream().anyMatch(result -> "gta-vi-collector".equals(result.slug())));
    }

    @Test
    void searchFallsBackToSteamAppIdLookupWhenTextSearchIsEmpty() {
        IgdbGameMatch subnauticaMatch = new IgdbGameMatch(
                300001L,
                "Subnautica 2",
                "subnautica-2",
                null,
                null,
                1962700,
                88,
                90,
                List.of("Adventure"),
                List.of(),
                0,
                LocalDate.of(2026, 5, 14),
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        when(igdbSearchClient.search(anyString(), anyInt())).thenReturn(List.of());
        when(igdbSearchClient.lookupBySteamAppId(1962700)).thenReturn(Optional.of(subnauticaMatch));

        List<GameCatalogSearchResponse> results = gameCatalogService.search("1962700");

        assertTrue(results.stream().anyMatch(result -> "subnautica-2".equals(result.slug())));
        verify(igdbSearchClient).lookupBySteamAppId(1962700);
    }

    @Test
    void searchSkipsDirectLookupWhenTextSearchFindsMatches() {
        IgdbGameMatch textMatch = new IgdbGameMatch(
                1001L,
                "Factorio",
                "factorio",
                null,
                null,
                427520,
                90,
                null,
                List.of("Strategy"),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        when(igdbSearchClient.search(anyString(), anyInt())).thenReturn(List.of(textMatch));

        List<GameCatalogSearchResponse> results = gameCatalogService.search("factorio");

        assertTrue(results.stream().anyMatch(result -> "factorio".equals(result.slug())));
        verify(igdbSearchClient, never()).lookupBySteamAppId(anyInt());
    }

    @Test
    void searchHandlesDuplicateIgdbMatchesInSameResponse() {
        IgdbGameMatch duplicateMatch = new IgdbGameMatch(
                2001L,
                "Apex Legends Champions Edition",
                "apex-legends-champions-edition",
                null,
                null,
                null,
                null,
                null,
                List.of("Shooter"),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        when(igdbSearchClient.search(anyString(), anyInt()))
                .thenReturn(List.of(duplicateMatch, duplicateMatch));

        List<GameCatalogSearchResponse> results = gameCatalogService.search("apex champions");

        assertTrue(results.stream().anyMatch(result ->
                "apex-legends-champions-edition".equals(result.slug())));
        assertEquals(
                1,
                results.stream()
                        .filter(result -> "apex-legends-champions-edition".equals(result.slug()))
                        .count()
        );
        assertEquals(1, gameRepository.findBySlug("apex-legends-champions-edition").stream().count());
    }

    @Test
    void searchUpdatesExistingCatalogRowInsteadOfInsertingDuplicateSlug() {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.executeWithoutResult(status -> gameRepository.save(Game.builder()
                .slug("apex-legends-champions-edition")
                .gameName("Apex Legends Champions Edition")
                .lifecycleState(LifecycleState.CATALOG)
                .build()));

        IgdbGameMatch match = new IgdbGameMatch(
                2001L,
                "Apex Legends Champions Edition",
                "apex-legends-champions-edition",
                null,
                null,
                null,
                80,
                85,
                List.of("Shooter"),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        when(igdbSearchClient.search(anyString(), anyInt())).thenReturn(List.of(match));

        List<GameCatalogSearchResponse> results = gameCatalogService.search("apex legends champions");

        assertTrue(results.stream().anyMatch(result ->
                "apex-legends-champions-edition".equals(result.slug())));
        assertEquals(1, gameRepository.findBySlug("apex-legends-champions-edition").stream().count());
    }

    @Test
    void searchMatchesLocalGameWhenPunctuationDiffers() {
        gameRepository.save(Game.builder()
                .slug("halloween-the-game")
                .gameName("Halloween: The Game")
                .lifecycleState(LifecycleState.CATALOG)
                .build());

        when(igdbSearchClient.search(anyString(), anyInt())).thenReturn(List.of());

        List<GameCatalogSearchResponse> results = gameCatalogService.search("halloween the game");

        assertTrue(results.stream().anyMatch(result -> "halloween-the-game".equals(result.slug())));
    }

    @Test
    void searchDeduplicatesTrademarkAliasSlug() {
        gameRepository.save(Game.builder()
                .slug("sluggy-adventure")
                .gameName("Sluggy Adventure")
                .lifecycleState(LifecycleState.CATALOG)
                .build());
        gameRepository.save(Game.builder()
                .slug("sluggy-adventure-tm")
                .gameName("Sluggy Adventure TM")
                .lifecycleState(LifecycleState.CATALOG)
                .build());

        when(igdbSearchClient.search(anyString(), anyInt())).thenReturn(List.of());

        List<GameCatalogSearchResponse> results = gameCatalogService.search("sluggy adventure");

        long canonicalMatches = results.stream()
                .filter(result -> "sluggy-adventure".equals(result.slug()))
                .count();

        assertEquals(1, canonicalMatches);
        assertFalse(results.stream().anyMatch(result -> "sluggy-adventure-tm".equals(result.slug())));
    }

    @Test
    void searchMarksTbaReleasesWithPlatformTargetsAsUpcoming() {
        Game tbaRelease = Game.builder()
                .slug("mystery-upcoming-title")
                .gameName("Mystery Upcoming Title")
                .lifecycleState(LifecycleState.CATALOG)
                .build();
        tbaRelease.replacePlatforms(List.of(
                GamePlatformDetail.builder()
                        .platform(GamePlatform.PC)
                        .releaseDate(null)
                        .build()
        ));
        gameRepository.save(tbaRelease);

        when(igdbSearchClient.search(anyString(), anyInt())).thenReturn(List.of());

        List<GameCatalogSearchResponse> results = gameCatalogService.search("mystery upcoming");

        assertEquals(1, results.stream()
                .filter(result -> "mystery-upcoming-title".equals(result.slug()))
                .count());
        assertTrue(results.stream()
                .filter(result -> "mystery-upcoming-title".equals(result.slug()))
                .anyMatch(result -> Boolean.TRUE.equals(result.upcomingRelease())));
    }

    @Test
    void searchHidesProtectedTitleSpinoffsForFortnite() {
        gameRepository.save(Game.builder()
                .slug("fortnite-2")
                .gameName("Fortnite 2")
                .lifecycleState(LifecycleState.CATALOG)
                .build());
        gameRepository.save(Game.builder()
                .slug("fortnite-2-love-on-the-battlefield")
                .gameName("Fortnite 2: Love on the Battlefield")
                .lifecycleState(LifecycleState.CATALOG)
                .build());

        when(igdbSearchClient.search(anyString(), anyInt())).thenReturn(List.of());

        List<GameCatalogSearchResponse> results = gameCatalogService.search("fortnite");

        assertEquals(1, results.size());
        assertEquals("fortnite", results.getFirst().slug());
        assertFalse(results.stream().anyMatch(result -> result.slug().startsWith("fortnite-")));
    }

    @Test
    void searchHidesVisualNovelSpam() {
        gameRepository.save(Game.builder()
                .slug("sex-any-cost-but-free")
                .gameName("Sex Any Cost But Free")
                .genreName("Visual Novel")
                .lifecycleState(LifecycleState.CATALOG)
                .build());

        when(igdbSearchClient.search(anyString(), anyInt())).thenReturn(List.of());

        List<GameCatalogSearchResponse> results = gameCatalogService.search("sex");

        assertTrue(results.isEmpty());
    }
}
