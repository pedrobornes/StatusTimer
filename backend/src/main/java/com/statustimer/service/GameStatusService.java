package com.statustimer.service;

import com.statustimer.dto.response.GameStatusDetailResponse;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.dto.response.TelemetryHistorySnapshotResponse;
import com.statustimer.dto.response.TelemetryIncidentResponse;
import com.statustimer.entity.TelemetryStatus;
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

    private static final List<TelemetryStatus> INCIDENT_STATUSES = List.of(
            TelemetryStatus.DOWN,
            TelemetryStatus.MAINTENANCE
    );

    private final GameTelemetryService gameTelemetryService;
    private final GamingNewsService gamingNewsService;

    @Transactional(readOnly = true)
    public GameStatusDetailResponse findByGameSlug(String slug) {
        GameTelemetryResponse telemetry = gameTelemetryService.findByGameSlug(slug);
        List<TelemetryHistorySnapshotResponse> history =
                gameTelemetryService.findHistoryByGameSlug(slug);
        List<TelemetryIncidentResponse> incidents =
                gameTelemetryService.findRecentIncidentsByGameSlug(
                        slug,
                        PageRequest.of(0, INCIDENT_LIMIT)
                );
        List<GamingNewsResponse> news =
                gamingNewsService.findByGameTag(slug, NEWS_LIMIT);

        return new GameStatusDetailResponse(telemetry, history, incidents, news);
    }
}
