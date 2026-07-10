package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CatalogMatureContentPolicyTest {

    @Test
    void detectsSteamAdultFlag() {
        Game game = Game.builder()
                .slug("adult-title")
                .gameName("Adult Title")
                .steamAdultContent(true)
                .build();

        assertThat(CatalogMatureContentPolicy.shouldSkipCatalogSurfacing(game)).isTrue();
    }

    @Test
    void detectsExplicitMatureGenreLabels() {
        assertThat(CatalogMatureContentPolicy.containsMatureLabel("Sexual Content")).isTrue();
        assertThat(CatalogMatureContentPolicy.containsMatureLabel("Erotic")).isTrue();
        assertThat(CatalogMatureContentPolicy.containsMatureLabel("Shooter")).isFalse();
    }

    @Test
    void allowsNonSexualNudityTheme() {
        assertThat(CatalogMatureContentPolicy.containsMatureLabel("Non-sexual nudity")).isFalse();
    }

    @Test
    void steamExplicitSexualListingRequiresAdultOnlyDescriptors() {
        assertThat(CatalogMatureContentPolicy.isSteamExplicitSexualListing(List.of(5))).isFalse();
        assertThat(CatalogMatureContentPolicy.isSteamExplicitSexualListing(List.of(1, 2, 5))).isFalse();
        assertThat(CatalogMatureContentPolicy.isSteamExplicitSexualListing(List.of(3))).isTrue();
        assertThat(CatalogMatureContentPolicy.isSteamExplicitSexualListing(List.of(4))).isTrue();
    }

    @Test
    void bansWholeWordGayInSlug() {
        assertThat(CatalogMatureContentPolicy.containsBannedWord("gay-nation-a-gay-game-for-gays-gays-only"))
                .isTrue();
        assertThat(CatalogMatureContentPolicy.containsBannedWord("A Gay Game For Gays")).isTrue();
    }

    @Test
    void doesNotBanGayAsSubstring() {
        assertThat(CatalogMatureContentPolicy.containsBannedWord("pagay")).isFalse();
        assertThat(CatalogMatureContentPolicy.containsBannedWord("pagay-adventure")).isFalse();
        assertThat(CatalogMatureContentPolicy.containsBannedWord("opagay")).isFalse();
    }

    @Test
    void quarantinesBannedTitleGames() {
        Game game = Game.builder()
                .slug("gay-nation-a-gay-game-for-gays-gays-only")
                .gameName("Gay Nation")
                .lifecycleState(LifecycleState.CATALOG)
                .build();

        assertThat(CatalogMatureContentPolicy.applyQuarantineIfMature(game)).isTrue();
        assertThat(CatalogMatureContentPolicy.shouldSkipCatalogSurfacing(game)).isTrue();
    }

    @Test
    void quarantinesMatureGames() {
        Game game = Game.builder()
                .slug("adult-title")
                .gameName("Adult Title")
                .steamAdultContent(true)
                .lifecycleState(LifecycleState.CATALOG)
                .build();

        assertThat(CatalogMatureContentPolicy.applyQuarantineIfMature(game)).isTrue();
        assertThat(game.getStaleReason())
                .isEqualTo(IndexabilityProperties.STALE_REASON_MATURE_CONTENT);
        assertThat(game.getIsIndexable()).isFalse();
    }

    @Test
    void clearsStaleMatureQuarantineWhenGameIsClean() {
        Game game = Game.builder()
                .slug("forza-horizon-5")
                .gameName("Forza Horizon 5")
                .steamAdultContent(false)
                .staleReason(IndexabilityProperties.STALE_REASON_MATURE_CONTENT)
                .lifecycleState(LifecycleState.CATALOG)
                .build();

        assertThat(CatalogMatureContentPolicy.applyQuarantineIfMature(game)).isFalse();
        assertThat(game.getStaleReason()).isNull();
        assertThat(CatalogMatureContentPolicy.shouldSkipCatalogSurfacing(game)).isFalse();
    }

    @Test
    void rejectsMatureIgdbMatch() {
        IgdbGameMatch match = new IgdbGameMatch(
                1L,
                "Example Adult Game",
                "example-adult-game",
                null,
                null,
                null,
                null,
                null,
                List.of("Adventure"),
                List.of("Erotic"),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        assertThat(CatalogMatureContentPolicy.isMatureIgdbMatch(match)).isTrue();
    }
}
