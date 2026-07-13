package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.entity.Game;
import com.statustimer.integration.IgdbSearchClient.IgdbGameMatch;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class CatalogDiscoveryPolicyTest {

    @Test
    void excludesVisualNovelGenre() {
        assertThat(CatalogDiscoveryPolicy.hasExcludedGenre(List.of("Visual Novel"))).isTrue();
        assertThat(CatalogDiscoveryPolicy.hasExcludedGenre(List.of("Shooter"))).isFalse();
    }

    @Test
    void excludesVisualNovelGamesFromSurfacing() {
        Game game = Game.builder()
                .slug("some-story")
                .gameName("Some Story")
                .genreName("Visual Novel")
                .build();

        assertThat(CatalogDiscoveryPolicy.shouldSkipCatalogSurfacing(game)).isTrue();
        assertThat(CatalogDiscoveryPolicy.applyQuarantineIfExcluded(game)).isTrue();
    }

    @Test
    void excludesSexualIgdbMatches() {
        IgdbGameMatch match = new IgdbGameMatch(
                1L,
                "Sex Any Cost But Free",
                "sex-any-cost-but-free",
                null,
                null,
                null,
                null,
                null,
                List.of("Adventure"),
                List.of(),
                0,
                null,
                List.of(),
                List.of(),
                null,
                Map.of()
        );

        assertThat(CatalogDiscoveryPolicy.isExcludedIgdbMatch(match)).isTrue();
    }
}
