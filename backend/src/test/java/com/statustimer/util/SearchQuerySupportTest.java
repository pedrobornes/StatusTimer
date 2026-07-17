package com.statustimer.util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class SearchQuerySupportTest {

    @Test
    void matchesIgnoresPunctuationDifferences() {
        assertTrue(SearchQuerySupport.matches(
                "halloween the game",
                "Halloween: The Game"
        ));
    }

    @Test
    void matchesCatalogQueryUsesSlugFallback() {
        assertTrue(SearchQuerySupport.matchesCatalogQuery(
                "halloween the game",
                "Halloween: The Game",
                "halloween-the-game"
        ));
    }

    @Test
    void matchesRequiresAllSignificantTokens() {
        assertTrue(SearchQuerySupport.matches("forza horizon", "Forza Horizon 5"));
        assertFalse(SearchQuerySupport.matches("forza kart", "Forza Horizon 5"));
    }

    @Test
    void searchVariantsIncludeRelaxedQuery() {
        assertTrue(SearchQuerySupport.searchVariants("Halloween: The Game")
                .contains("halloween the game"));
    }

    @Test
    void searchVariantsExpandPathOfExileAliases() {
        assertTrue(SearchQuerySupport.searchVariants("poe").contains("path of exile"));
        assertTrue(SearchQuerySupport.searchVariants("poe2").contains("path of exile 2"));
        assertTrue(SearchQuerySupport.searchVariants("PoE 2").contains("path of exile 2"));
    }

    @Test
    void matchesCatalogQueryUsesPathOfExileAlias() {
        assertTrue(SearchQuerySupport.matchesCatalogQuery(
                "poe",
                "Path of Exile",
                "path-of-exile"
        ));
        assertTrue(SearchQuerySupport.matchesCatalogQuery(
                "poe2",
                "Path of Exile 2",
                "path-of-exile-2"
        ));
    }
}
