package com.statustimer.util;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.entity.Game;
import java.util.List;
import org.junit.jupiter.api.Test;

class IgdbMetadataSupportTest {

    @Test
    void applyGenreNamesStoresFullListAndPrimaryGenre() {
        Game game = Game.builder().slug("rust").gameName("Rust").build();

        IgdbMetadataSupport.applyGenreNames(
                game,
                List.of("Action", "Adventure", "Survival")
        );

        assertThat(game.getGenreNames()).containsExactly("Action", "Adventure", "Survival");
        assertThat(game.getGenreName()).isEqualTo("Action");
    }

    @Test
    void applyGenreNamesIgnoresBlankEntries() {
        Game game = Game.builder().slug("rust").gameName("Rust").build();

        IgdbMetadataSupport.applyGenreNames(
                game,
                List.of(" Action ", "", "Survival", "Survival")
        );

        assertThat(game.getGenreNames()).containsExactly("Action", "Survival");
        assertThat(game.getGenreName()).isEqualTo("Action");
    }
}
