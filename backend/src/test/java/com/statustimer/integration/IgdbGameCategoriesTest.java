package com.statustimer.integration;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class IgdbGameCategoriesTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void acceptsMainGameCategoryZero() throws Exception {
        var row = objectMapper.readTree("""
                { "id": 1, "name": "Rust", "category": 0 }
                """);

        assertThat(IgdbGameCategories.isMainGame(row)).isTrue();
    }

    @Test
    void rejectsModCategory() throws Exception {
        var row = objectMapper.readTree("""
                { "id": 2, "name": "Rust Mod", "category": 5 }
                """);

        assertThat(IgdbGameCategories.isMainGame(row)).isFalse();
    }

    @Test
    void acceptsMissingCategoryForLegacyRows() throws Exception {
        var row = objectMapper.readTree("""
                { "id": 3, "name": "Legacy Game" }
                """);

        assertThat(IgdbGameCategories.isMainGame(row)).isTrue();
    }

    @Test
    void acceptsRemakeGameType() throws Exception {
        var row = objectMapper.readTree("""
                { "id": 337738, "name": "Assassin's Creed Black Flag Resynced", "game_type": 8 }
                """);

        assertThat(IgdbGameCategories.isCatalogGame(row)).isTrue();
        assertThat(IgdbGameCategories.isMainGame(row)).isTrue();
    }
}
