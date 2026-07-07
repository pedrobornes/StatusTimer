package com.statustimer.service;

import com.statustimer.dto.response.GameStatusDetailResponse;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.dto.response.TelemetryHistorySnapshotResponse;
import com.statustimer.dto.response.TelemetryIncidentResponse;
import com.statustimer.dto.response.TelemetryUptimeSummaryResponse;
import com.statustimer.repository.GameRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GameStatusService {

    private static final int INCIDENT_LIMIT = 5;
    private static final int NEWS_LIMIT = 6;

    private final GameTelemetryService gameTelemetryService;
    private final GamingNewsService gamingNewsService;
    private final CatalogActivationService catalogActivationService;
    private final GameRepository gameRepository;
    private final TelemetryDailyRollupService telemetryDailyRollupService;

    @Transactional
    public GameStatusDetailResponse findByGameSlug(String slug) {
        catalogActivationService.activateOnDemand(slug);

        boolean telemetryReady = catalogActivationService.isTelemetryReady(slug);
        List<GamingNewsResponse> news = gamingNewsService.findByGameTag(slug, NEWS_LIMIT);
        LocalDateTime firstMonitoredAt = resolveFirstMonitoredAt(slug);

        if (!telemetryReady) {
            return gameTelemetryService.findOptionalByGameSlug(slug)
                    .map(telemetry -> buildDetailResponse(
                            telemetry,
                            slug,
                            true,
                            news,
                            firstMonitoredAt
                    ))
                    .orElseGet(() -> new GameStatusDetailResponse(
                            null,
                            List.of(),
                            List.of(),
                            news,
                            false,
                            firstMonitoredAt,
                            null
                    ));
        }

        GameTelemetryResponse telemetry = gameTelemetryService.findByGameSlug(slug);
        return buildDetailResponse(telemetry, slug, true, news, firstMonitoredAt);
    }

    private GameStatusDetailResponse buildDetailResponse(
            GameTelemetryResponse telemetry,
            String slug,
            boolean ready,
            List<GamingNewsResponse> news,
            LocalDateTime firstMonitoredAt
    ) {
        List<TelemetryHistorySnapshotResponse> history =
                gameTelemetryService.findHistoryByGameSlug(slug);
        List<TelemetryIncidentResponse> incidents =
                gameTelemetryService.findRecentIncidentsByGameSlug(
                        slug,
                        PageRequest.of(0, INCIDENT_LIMIT)
                );
        TelemetryUptimeSummaryResponse uptime = telemetryDailyRollupService.summarizeUptime(slug);

        return new GameStatusDetailResponse(
                telemetry,
                history,
                incidents,
                news,
                ready,
                firstMonitoredAt,
                uptime
        );
    }

    private LocalDateTime resolveFirstMonitoredAt(String slug) {
        return gameRepository.findBySlug(slug)
                .map(game -> game.getFirstMonitoredAt())
                .orElse(null);
    }
}
