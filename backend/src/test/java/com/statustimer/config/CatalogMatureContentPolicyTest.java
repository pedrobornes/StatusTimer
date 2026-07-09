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
    void detectsMatureGenreLabels() {
        assertThat(CatalogMatureContentPolicy.containsMatureLabel("Sexual Content")).isTrue();
        assertThat(CatalogMatureContentPolicy.containsMatureLabel("Shooter")).isFalse();
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
