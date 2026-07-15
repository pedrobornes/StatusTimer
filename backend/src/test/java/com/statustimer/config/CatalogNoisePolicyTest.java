package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import org.junit.jupiter.api.Test;

class CatalogNoisePolicyTest {

    @Test
    void detectsKnownTwitchCategoryByName() {
        assertThat(CatalogNoisePolicy.isTwitchCategoryNoise("games-demos", "Games + Demos"))
                .isTrue();
        assertThat(CatalogNoisePolicy.isTwitchCategoryNoise("animals-aquariums-and-zoos", "Animals, Aquariums,and Zoos"))
                .isTrue();
        assertThat(CatalogNoisePolicy.isTwitchCategoryNoise(null, "Just Chatting"))
                .isTrue();
    }

    @Test
    void detectsTabletopRpgsAsTwitchNoise() {
        assertThat(CatalogNoisePolicy.isTwitchCategoryNoise("tabletop-rpgs", "Tabletop RPGs"))
                .isTrue();
    }

    @Test
    void detectsAmericanIdolAsTwitchNoise() {
        assertThat(CatalogNoisePolicy.isTwitchCategoryNoise("american-idol", "American Idol"))
                .isTrue();
    }

    @Test
    void detectsGamesDoneQuickAsTwitchNoise() {
        assertThat(CatalogNoisePolicy.isTwitchCategoryNoise("games-done-quick", "Games Done Quick"))
                .isTrue();
    }

    @Test
    void ignoresRealGames() {
        assertThat(CatalogNoisePolicy.isTwitchCategoryNoise("valorant", "VALORANT"))
                .isFalse();
        assertThat(CatalogNoisePolicy.isTwitchCategoryNoise("ark-survival-ascended", "ARK: Survival Ascended"))
                .isFalse();
    }

    @Test
    void applyQuarantineMarksNoiseEntries() {
        Game game = Game.builder()
                .slug("games-demos")
                .gameName("Games + Demos")
                .lifecycleState(LifecycleState.CATALOG)
                .build();

        assertThat(CatalogNoisePolicy.applyQuarantineIfNoise(game)).isTrue();
        assertThat(game.getStaleReason()).isEqualTo(IndexabilityProperties.STALE_REASON_TWITCH_CATEGORY);
        assertThat(game.getIsIndexable()).isFalse();
        assertThat(CatalogNoisePolicy.isQuarantined(game)).isTrue();
        assertThat(CatalogNoisePolicy.shouldSkipCatalogSurfacing(game)).isTrue();
    }
}
