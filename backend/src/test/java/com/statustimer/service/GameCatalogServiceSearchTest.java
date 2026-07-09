package com.statustimer.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import com.statustimer.repository.GameRepository;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GameCatalogServiceSearchTest {

    @Autowired
    private GameCatalogService gameCatalogService;

    @Autowired
    private GameRepository gameRepository;

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
}
