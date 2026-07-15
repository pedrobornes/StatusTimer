package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.dto.response.GameCatalogSearchResponse;
import java.util.List;
import org.junit.jupiter.api.Test;

class CatalogEditionCollapsePolicyTest {

    @Test
    void resolveFranchiseKeyStripsLegendaryEditionFromTitle() {
        assertThat(CatalogEditionCollapsePolicy.resolveFranchiseKey(
                "Overwatch: Legendary Edition",
                "overwatch-legendary-edition"
        )).isEqualTo("overwatch");
    }

    @Test
    void collapseSearchResultsMergesOverwatchLegendaryEditionIntoBaseRow() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(1L, "overwatch--1", "Overwatch"),
                searchRow(2L, "overwatch-legendary-edition", "Overwatch: Legendary Edition")
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "overwatch"
        );

        assertThat(collapsed).hasSize(1);
        assertThat(collapsed.getFirst().slug()).isEqualTo("overwatch");
        assertThat(collapsed.getFirst().gameName()).isEqualTo("Overwatch");
    }

    @Test
    void collapseSearchResultsPreservesLegendaryEditionWhenQueryAsksForIt() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(1L, "overwatch--1", "Overwatch"),
                searchRow(2L, "overwatch-legendary-edition", "Overwatch: Legendary Edition")
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "overwatch legendary"
        );

        assertThat(collapsed).hasSize(2);
    }

    @Test
    void resolveFranchiseKeyStripsDeluxeAndYearEditionFromTitle() {
        assertThat(CatalogEditionCollapsePolicy.resolveFranchiseKey(
                "Sea of Thieves 2025 Deluxe Edition",
                "sea-of-thieves-2025-deluxe-edition"
        )).isEqualTo("sea-of-thieves");
    }

    @Test
    void resolveFranchiseKeyMapsWorldOfWarcraftClassicToRetailFranchise() {
        assertThat(CatalogEditionCollapsePolicy.resolveFranchiseKey(
                "World of Warcraft Classic",
                "world-of-warcraft-classic"
        )).isEqualTo("world-of-warcraft");

        assertThat(CatalogEditionCollapsePolicy.resolveFranchiseKey(
                "World of Warcraft Classic: Cataclysm",
                "world-of-warcraft-cataclysm-classic"
        )).isEqualTo("world-of-warcraft");
    }

    @Test
    void collapseSearchResultsMergesWorldOfWarcraftClassicIntoRetailRow() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(
                        1L,
                        "world-of-warcraft-classic",
                        "World of Warcraft Classic",
                        null,
                        null,
                        18_000L,
                        null,
                        null
                ),
                searchRow(
                        2L,
                        "world-of-warcraft",
                        "World of Warcraft",
                        null,
                        null,
                        18_000L,
                        null,
                        null
                )
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "world of warcraft"
        );

        assertThat(collapsed).hasSize(1);
        GameCatalogSearchResponse row = collapsed.getFirst();
        assertThat(row.slug()).isEqualTo("world-of-warcraft");
        assertThat(row.gameName()).isEqualTo("World of Warcraft");
        assertThat(row.twitchViewers()).isEqualTo(18_000L);
    }

    @Test
    void collapseSearchResultsKeepsClassicRowWhenQueryAsksForClassic() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(1L, "world-of-warcraft-classic", "World of Warcraft Classic"),
                searchRow(2L, "world-of-warcraft", "World of Warcraft")
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "world of warcraft classic"
        );

        assertThat(collapsed).hasSize(2);
    }

    @Test
    void collapseSearchResultsPromotesRetailSlugWhenOnlyClassicVariantsMatch() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(
                        1L,
                        "world-of-warcraft-classic-era",
                        "World of Warcraft Classic Era",
                        null,
                        null,
                        22_000L,
                        null,
                        null
                ),
                searchRow(
                        2L,
                        "world-of-warcraft-cataclysm-classic",
                        "World of Warcraft: Cataclysm Classic",
                        null,
                        null,
                        9_000L,
                        null,
                        null
                )
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "wow"
        );

        assertThat(collapsed).hasSize(1);
        GameCatalogSearchResponse row = collapsed.getFirst();
        assertThat(row.slug()).isEqualTo("world-of-warcraft");
        assertThat(row.gameName()).isEqualTo("World of Warcraft");
        assertThat(row.twitchViewers()).isEqualTo(22_000L);
    }

    @Test
    void collapseSearchResultsKeepsSingleBaseTitleForSeaOfThievesVariants() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(1L, "sea-of-thieves-x-edition", "Sea of Thieves X Edition"),
                searchRow(2L, "sea-of-thieves-2024-edition", "Sea of Thieves 2024 Edition"),
                searchRow(3L, "sea-of-thieves-deluxe-edition", "Sea of Thieves Deluxe Edition"),
                searchRow(4L, "sea-of-thieves-2025-deluxe-edition", "Sea of Thieves 2025 Deluxe Edition"),
                searchRow(5L, "sea-of-thieves-anniversary-edition", "Sea of Thieves Anniversary Edition"),
                searchRow(6L, "sea-of-thieves", "Sea of Thieves", 88)
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "sea of thieves"
        );

        assertThat(collapsed).hasSize(1);
        assertThat(collapsed.getFirst().slug()).isEqualTo("sea-of-thieves");
        assertThat(collapsed.getFirst().gameName()).isEqualTo("Sea of Thieves");
    }

    @Test
    void collapseSearchResultsPreservesEditionSpecificQuery() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(1L, "sea-of-thieves-deluxe-edition", "Sea of Thieves Deluxe Edition"),
                searchRow(2L, "sea-of-thieves-2025-deluxe-edition", "Sea of Thieves 2025 Deluxe Edition")
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "sea of thieves deluxe"
        );

        assertThat(collapsed).hasSize(2);
    }

    @Test
    void collapseSearchResultsDoesNotMergeDifferentFranchises() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(1L, "sea-of-thieves", "Sea of Thieves"),
                searchRow(2L, "sea-of-solitude", "Sea of Solitude")
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "sea"
        );

        assertThat(collapsed).hasSize(2);
    }

    @Test
    void collapseSearchResultsMergesSteamMetricsFromEditionVariantsIntoBaseRow() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(
                        1L,
                        "sea-of-thieves",
                        "Sea of Thieves",
                        null,
                        null,
                        null,
                        88,
                        null
                ),
                searchRow(
                        2L,
                        "sea-of-thieves-deluxe-edition",
                        "Sea of Thieves Deluxe Edition",
                        1172620,
                        12_500L,
                        4_200L,
                        86,
                        null
                )
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "sea of thieves"
        );

        assertThat(collapsed).hasSize(1);
        GameCatalogSearchResponse row = collapsed.getFirst();
        assertThat(row.slug()).isEqualTo("sea-of-thieves");
        assertThat(row.gameName()).isEqualTo("Sea of Thieves");
        assertThat(row.steamAppId()).isEqualTo(1172620);
        assertThat(row.livePlayers()).isEqualTo(12_500L);
        assertThat(row.twitchViewers()).isEqualTo(4_200L);
        assertThat(row.userRating()).isEqualTo(88);
    }

    @Test
    void collapseSearchResultsDoesNotMergeDiabloSequels() {
        List<GameCatalogSearchResponse> results = List.of(
                searchRow(1L, "diablo-ii", "Diablo II", 1234, 900L, 100L, null, null),
                searchRow(2L, "diablo-iv-deluxe-edition", "Diablo IV Deluxe Edition", 5678, 40_000L, 8_000L, null, null)
        );

        List<GameCatalogSearchResponse> collapsed = CatalogEditionCollapsePolicy.collapseSearchResults(
                results,
                "diablo"
        );

        assertThat(collapsed).hasSize(2);
        assertThat(collapsed)
                .extracting(GameCatalogSearchResponse::slug)
                .containsExactlyInAnyOrder("diablo-ii", "diablo-iv-deluxe-edition");
    }

    private static GameCatalogSearchResponse searchRow(
            Long id,
            String slug,
            String gameName
    ) {
        return searchRow(id, slug, gameName, null, null, null, null, null);
    }

    private static GameCatalogSearchResponse searchRow(
            Long id,
            String slug,
            String gameName,
            Integer userRating
    ) {
        return searchRow(id, slug, gameName, null, null, null, userRating, null);
    }

    private static GameCatalogSearchResponse searchRow(
            Long id,
            String slug,
            String gameName,
            Integer steamAppId,
            Long livePlayers,
            Long twitchViewers,
            Integer userRating,
            Integer criticRating
    ) {
        return new GameCatalogSearchResponse(
                id,
                slug,
                gameName,
                null,
                null,
                steamAppId,
                userRating,
                criticRating,
                null,
                List.of(),
                livePlayers,
                twitchViewers,
                false,
                null
        );
    }
}
