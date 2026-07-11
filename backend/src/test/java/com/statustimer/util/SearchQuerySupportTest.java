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
}
