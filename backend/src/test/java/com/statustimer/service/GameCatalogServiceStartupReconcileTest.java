package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.statustimer.entity.Game;
import com.statustimer.entity.GameType;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient;
import com.statustimer.integration.SteamStoreAppDetailsClient;
import com.statustimer.integration.SteamStoreAppDetailsClient.SteamAppMetadata;
import com.statustimer.repository.GameRepository;
import java.time.LocalDate;
import java.util.List;
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
class GameCatalogServiceStartupReconcileTest {

    private static final String SLUG = "startup-reconcile-no-steam";

    @Autowired
    private GameCatalogService gameCatalogService;

    @Autowired
    private GameRepository gameRepository;

    @MockitoBean
    private IgdbSearchClient igdbSearchClient;

    @MockitoBean
    private SteamStoreAppDetailsClient steamStoreAppDetailsClient;

    @BeforeEach
    void seedGame() {
        when(igdbSearchClient.isConfigured()).thenReturn(false);
        when(steamStoreAppDetailsClient.isRateLimited()).thenReturn(false);

        gameRepository.save(Game.builder()
                .slug(SLUG)
                .gameName("Startup Reconcile No Steam")
                .lifecycleState(LifecycleState.CATALOG)
                .steamAppId(999_101)
                .gameType(GameType.MULTIPLAYER)
                .steamPriceFinal(2999)
                .steamCurrency("USD")
                .steamShortDescription("Existing listing")
                .steamAdultContent(false)
                .build());
    }

    @Test
    void reconcileGameTypesDoesNotCallSteam() {
        clearInvocations(steamStoreAppDetailsClient);

        int updated = gameCatalogService.reconcileGameTypes();

        assertThat(updated).isZero();
        verify(steamStoreAppDetailsClient, never()).fetchMetadata(anyInt());
    }

    @Test
    void reconcileSteamAdultContentFlagsDoesNotCallSteam() {
        clearInvocations(steamStoreAppDetailsClient);

        Game game = gameRepository.findBySlug(SLUG).orElseThrow();
        game.setSteamAdultContent(true);
        gameRepository.save(game);

        gameCatalogService.reconcileSteamAdultContentFlags();

        verify(steamStoreAppDetailsClient, never()).fetchMetadata(anyInt());
    }

    @Test
    void refreshSteamStoreMetadataOnVisitRefreshesStalePrice() {
        when(steamStoreAppDetailsClient.fetchMetadata(999_101)).thenReturn(Optional.of(
                new SteamAppMetadata(
                        LocalDate.of(2024, 1, 1),
                        false,
                        null,
                        null,
                        "Updated description",
                        999,
                        "USD",
                        true,
                        false,
                        false,
                        true,
                        List.of(2),
                        125_000,
                        90
                )
        ));

        gameCatalogService.refreshSteamStoreMetadataOnVisit(SLUG);

        Game updated = gameRepository.findBySlug(SLUG).orElseThrow();
        assertThat(updated.getSteamPriceFinal()).isEqualTo(999);
        verify(steamStoreAppDetailsClient).fetchMetadata(999_101);

        gameCatalogService.refreshSteamStoreMetadataOnVisit(SLUG);
        verify(steamStoreAppDetailsClient).fetchMetadata(999_101);
    }
}
