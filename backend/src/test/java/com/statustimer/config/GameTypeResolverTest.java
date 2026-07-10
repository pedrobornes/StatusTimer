package com.statustimer.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.entity.GameType;
import java.util.List;
import org.junit.jupiter.api.Test;

class GameTypeResolverTest {

    @Test
    void resolvesMultiplayerFromSteamCategories() {
        assertThat(GameTypeResolver.resolveFromSteamCategoryIds(List.of(2, 36)))
                .isEqualTo(GameType.MULTIPLAYER);
        assertThat(GameTypeResolver.resolveFromSteamCategoryIds(List.of(1)))
                .isEqualTo(GameType.MULTIPLAYER);
    }

    @Test
    void resolvesSinglePlayerWhenOnlySinglePlayerCategoryPresent() {
        assertThat(GameTypeResolver.resolveFromSteamCategoryIds(List.of(2)))
                .isEqualTo(GameType.SINGLE_PLAYER);
    }

    @Test
    void resolvesPinnedMultiplayerSlug() {
        assertThat(GameTypeResolver.resolvePinnedSlug("league-of-legends"))
                .isEqualTo(GameType.MULTIPLAYER);
        assertThat(GameTypeResolver.resolvePinnedSlug("elden-ring"))
                .isNull();
    }
}
