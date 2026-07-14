package com.statustimer.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.statustimer.dto.response.TelemetryIncidentResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetryHistory;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryHistoryRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class GameTelemetryServiceIncidentTest {

    @Autowired
    private GameTelemetryService gameTelemetryService;

    @Autowired
    private GameRepository gameRepository;

    @Autowired
    private GameTelemetryHistoryRepository gameTelemetryHistoryRepository;

    @BeforeEach
    void seedGames() {
        gameRepository.save(Game.builder()
                .slug("incident-live-game")
                .gameName("Incident Live Game")
                .lifecycleState(LifecycleState.MONITORED)
                .build());

        gameRepository.save(Game.builder()
                .slug("the-blood-of-dawnwalker")
                .gameName("The Blood of Dawnwalker")
                .lifecycleState(LifecycleState.MONITORED)
                .steamReleaseDate(LocalDate.now().plusMonths(2))
                .steamAdultContent(true)
                .build());
    }

    @Test
    void findRecentIncidentsSkipsUpcomingAndMatureCatalogGames() {
        Game liveGame = gameRepository.findBySlug("incident-live-game").orElseThrow();
        Game upcomingGame = gameRepository.findBySlug("the-blood-of-dawnwalker").orElseThrow();
        LocalDateTime checkedAt = LocalDateTime.now();

        gameTelemetryHistoryRepository.save(GameTelemetryHistory.builder()
                .game(upcomingGame)
                .status(TelemetryStatus.MAINTENANCE)
                .dataSource(TelemetrySource.STEAM_API)
                .checkedAt(checkedAt)
                .build());

        gameTelemetryHistoryRepository.save(GameTelemetryHistory.builder()
                .game(liveGame)
                .status(TelemetryStatus.DOWN)
                .dataSource(TelemetrySource.STEAM_API)
                .checkedAt(checkedAt.minusMinutes(1))
                .build());

        java.util.List<TelemetryIncidentResponse> incidents = gameTelemetryService.findRecentIncidents();

        assertThat(incidents).extracting(TelemetryIncidentResponse::gameSlug)
                .containsExactly("incident-live-game");
    }

    @Test
    void findRecentIncidentsDeduplicatesByGameSlugKeepingMostRecent() {
        Game liveGame = gameRepository.findBySlug("incident-live-game").orElseThrow();
        LocalDateTime checkedAt = LocalDateTime.now();

        gameTelemetryHistoryRepository.save(GameTelemetryHistory.builder()
                .game(liveGame)
                .status(TelemetryStatus.MAINTENANCE)
                .dataSource(TelemetrySource.STEAM_API)
                .checkedAt(checkedAt)
                .build());

        gameTelemetryHistoryRepository.save(GameTelemetryHistory.builder()
                .game(liveGame)
                .status(TelemetryStatus.MAINTENANCE)
                .dataSource(TelemetrySource.STEAM_API)
                .checkedAt(checkedAt.minusMinutes(35))
                .build());

        gameTelemetryHistoryRepository.save(GameTelemetryHistory.builder()
                .game(liveGame)
                .status(TelemetryStatus.MAINTENANCE)
                .dataSource(TelemetrySource.STEAM_API)
                .checkedAt(checkedAt.minusMinutes(70))
                .build());

        java.util.List<TelemetryIncidentResponse> incidents = gameTelemetryService.findRecentIncidents();

        assertThat(incidents).hasSize(1);
        assertThat(incidents.getFirst().gameSlug()).isEqualTo("incident-live-game");
        assertThat(incidents.getFirst().publishedAt()).isEqualTo(checkedAt);
    }
}
