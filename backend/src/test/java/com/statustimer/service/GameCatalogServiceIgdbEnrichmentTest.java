package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import com.statustimer.repository.GameRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
class GameCatalogServiceIgdbEnrichmentTest {

    private static final String SLUG = "assassin-s-creed-black-flag-resynced";

    @Autowired
    private GameCatalogService gameCatalogService;

    @Autowired
    private GameRepository gameRepository;

    @MockitoBean
    private IgdbSearchClient igdbSearchClient;

    @BeforeEach
    void seedGame() {
        when(igdbSearchClient.isConfigured()).thenReturn(true);

        gameRepository.save(Game.builder()
                .slug(SLUG)
                .gameName("Assassin's Creed Black Flag Resynced")
                .lifecycleState(LifecycleState.CATALOG)
                .logoUrl("none")
                .build());
    }

    @Test
    void enrichCatalogProfileOnDemandUsesIgdbPossessiveSlugVariant() {
        IgdbGameMatch match = new IgdbGameMatch(
                337738L,
                "Assassin's Creed Black Flag Resynced",
                "assassins-creed-black-flag-resynced",
                "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar1.jpg",
                "https://images.igdb.com/igdb/image/upload/t_cover_big/co1.jpg",
                3751950,
                82,
                80,
                List.of("Adventure"),
                List.of("Action"),
                169,
                null,
                List.of("https://images.igdb.com/igdb/image/upload/t_screenshot_huge/sc1.jpg"),
                List.of(),
                null,
                Map.of()
        );

        when(igdbSearchClient.lookupBySlug(SLUG)).thenReturn(Optional.empty());
        when(igdbSearchClient.lookupBySlug("assassins-creed-black-flag-resynced"))
                .thenReturn(Optional.of(match));

        gameCatalogService.enrichCatalogProfileOnDemand(SLUG);

        Game updated = gameRepository.findBySlug(SLUG).orElseThrow();
        assertThat(updated.getIgdbGameId()).isEqualTo(337738L);
        assertThat(updated.getSteamAppId()).isEqualTo(3751950);
        assertThat(updated.getLogoUrl()).contains("images.igdb.com");
        assertThat(updated.getCoverUrl()).contains("images.igdb.com");
        assertThat(updated.getScreenshotUrls()).isNotEmpty();

        verify(igdbSearchClient, never()).search(anyString(), anyInt());
        verify(igdbSearchClient, never()).lookupById(anyLong());
    }

    @Test
    void enrichCatalogProfileOnDemandUsesKnownSteamAppIdLookup() {
        IgdbGameMatch match = new IgdbGameMatch(
                337738L,
                "Assassin's Creed Black Flag Resynced",
                "assassins-creed-black-flag-resynced",
                "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar2.jpg",
                "https://images.igdb.com/igdb/image/upload/t_cover_big/co2.jpg",
                3751950,
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

        when(igdbSearchClient.lookupBySlug(anyString())).thenReturn(Optional.empty());
        when(igdbSearchClient.lookupBySteamAppId(3751950)).thenReturn(Optional.of(match));

        gameCatalogService.enrichCatalogProfileOnDemand(SLUG);

        Game updated = gameRepository.findBySlug(SLUG).orElseThrow();
        assertThat(updated.getSteamAppId()).isEqualTo(3751950);
        assertThat(updated.getIgdbGameId()).isEqualTo(337738L);
        assertThat(updated.getLogoUrl()).contains("images.igdb.com");

        verify(igdbSearchClient).lookupBySteamAppId(eq(3751950));
        verify(igdbSearchClient, never()).search(anyString(), anyInt());
    }
}
