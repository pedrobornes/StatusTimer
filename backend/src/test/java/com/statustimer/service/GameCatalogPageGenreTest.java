package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.dto.response.GameCatalogPageResponse;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryRepository;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GameCatalogPageGenreTest {

    @Autowired
    private GameTelemetryService gameTelemetryService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GameTelemetryRepository gameTelemetryRepository;

    @BeforeEach
    void seedCatalogGame() {
        Game game = gameRepository.save(Game.builder()
                .slug("catalog-genre-test-game")
                .gameName("Catalog Genre Test Game")
                .genreName("Shooter")
                .genreNames(List.of("Shooter", "Tactical"))
                .lifecycleState(LifecycleState.MONITORED)
                .isIndexable(true)
                .twitchRank(1)
                .build());

        gameTelemetryRepository.save(GameTelemetry.builder()
                .game(game)
                .status(TelemetryStatus.ONLINE)
                .latencyMs(120)
                .dataSource(TelemetrySource.STEAM_API)
                .lastChecked(LocalDateTime.now())
                .build());
    }

    @Test
    void findCatalogPageExposesFullGenreList() {
        GameCatalogPageResponse page = gameTelemetryService.findCatalogPage(0, 48, null, null);

        GameTelemetryResponse item = page.items().stream()
                .filter(entry -> "catalog-genre-test-game".equals(entry.gameSlug()))
                .findFirst()
                .orElseThrow();
        assertThat(item.genreNames()).containsExactly("Shooter", "Tactical");
    }
}
