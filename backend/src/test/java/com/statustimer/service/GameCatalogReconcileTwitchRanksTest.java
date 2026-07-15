package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.dto.request.ReconcileTwitchRanksRequest;
import com.statustimer.entity.Game;
import com.statustimer.entity.LifecycleState;
import com.statustimer.repository.GameRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GameCatalogReconcileTwitchRanksTest {

    @Autowired
    private GameCatalogService gameCatalogService;

    @Autowired
    private GameRepository gameRepository;

    @Test
    void reconcileTwitchRanksClearsGamesOutsideActiveTopList() {
        gameRepository.save(Game.builder()
                .slug("active-top-game")
                .gameName("Active Top Game")
                .lifecycleState(LifecycleState.CATALOG)
                .twitchRank(1)
                .build());

        Game stale = gameRepository.save(Game.builder()
                .slug("stale-ranked-game")
                .gameName("Stale Ranked Game")
                .lifecycleState(LifecycleState.CATALOG)
                .twitchRank(88)
                .build());

        var response = gameCatalogService.reconcileTwitchRanks(
                new ReconcileTwitchRanksRequest(java.util.List.of("active-top-game"))
        );

        assertThat(response.clearedRanks()).isEqualTo(1);
        assertThat(gameRepository.findBySlug("stale-ranked-game"))
                .map(Game::getTwitchRank)
                .isEmpty();
        assertThat(gameRepository.findBySlug("active-top-game"))
                .map(Game::getTwitchRank)
                .contains(1);
    }
}
