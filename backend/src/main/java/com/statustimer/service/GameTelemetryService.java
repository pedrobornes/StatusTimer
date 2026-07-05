package com.statustimer.service;

import com.statustimer.config.TrackedGameCatalog;
import com.statustimer.dto.request.GameTelemetryPayload;
import com.statustimer.dto.request.SyncTelemetryRequest;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.SyncTelemetryResponse;
import com.statustimer.dto.response.TelemetryHistorySnapshotResponse;
import com.statustimer.dto.response.TelemetryIncidentResponse;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.GameTelemetryHistory;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryHistoryRepository;
import com.statustimer.repository.GameTelemetryRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameTelemetryService {

    private static final int HISTORY_RETENTION_DAYS = 7;
    private static final List<TelemetryStatus> INCIDENT_STATUSES = List.of(
            TelemetryStatus.DOWN,
            TelemetryStatus.MAINTENANCE
    );

    private final GameTelemetryRepository gameTelemetryRepository;
    private final GameTelemetryHistoryRepository gameTelemetryHistoryRepository;
    private final GameRepository gameRepository;

    @Transactional(readOnly = true)
    public List<GameTelemetryResponse> findAll() {
        return gameTelemetryRepository.findAll().stream()
                .map(entity -> GameTelemetryResponse.fromEntity(
                        entity,
                        gameRepository.findBySlug(entity.getGameSlug())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GameTelemetryResponse> findAllFeatured() {
        return gameTelemetryRepository.findAll().stream()
                .filter(entity -> TrackedGameCatalog.isFeatured(entity.getGameSlug()))
                .map(entity -> GameTelemetryResponse.fromEntity(
                        entity,
                        gameRepository.findBySlug(entity.getGameSlug())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public GameTelemetryResponse findByGameSlug(String gameSlug) {
        return gameTelemetryRepository.findByGameSlug(gameSlug)
                .map(entity -> GameTelemetryResponse.fromEntity(
                        entity,
                        gameRepository.findBySlug(entity.getGameSlug())
                ))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Telemetry not found for slug: " + gameSlug
                ));
    }

    @Transactional(readOnly = true)
    public List<TelemetryHistorySnapshotResponse> findHistoryByGameSlug(String gameSlug) {
        validateGameSlug(gameSlug);

        LocalDateTime since = LocalDateTime.now().minusDays(HISTORY_RETENTION_DAYS);

        return gameTelemetryRepository.findHistoryByGameSlugSince(gameSlug, since).stream()
                .map(TelemetryHistorySnapshotResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TelemetryIncidentResponse> findRecentIncidents() {
        return gameTelemetryRepository
                .findRecentIncidents(INCIDENT_STATUSES, PageRequest.of(0, 5)).stream()
                .map(TelemetryIncidentResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TelemetryIncidentResponse> findRecentIncidentsByGameSlug(
            String gameSlug,
            Pageable pageable
    ) {
        validateGameSlug(gameSlug);

        return gameTelemetryRepository
                .findRecentIncidentsByGameSlug(gameSlug, INCIDENT_STATUSES, pageable)
                .stream()
                .map(TelemetryIncidentResponse::fromEntity)
                .toList();
    }

    @Transactional
    public SyncTelemetryResponse syncTelemetry(SyncTelemetryRequest request) {
        if (request.entries() == null || request.entries().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one telemetry entry is required"
            );
        }

        int created = 0;
        int updated = 0;
        int skipped = 0;

        for (GameTelemetryPayload payload : request.entries()) {
            try {
                boolean isNew = upsertTelemetry(payload);
                if (isNew) {
                    created++;
                } else {
                    updated++;
                }
            } catch (ResponseStatusException exception) {
                skipped++;
                log.warn(
                        "Telemetry sync skipped for slug={}: {}",
                        payload.gameSlug(),
                        exception.getReason()
                );
            } catch (RuntimeException exception) {
                skipped++;
                log.error(
                        "Telemetry sync failed for slug={}. Preserving last known state.",
                        payload.gameSlug(),
                        exception
                );
            }
        }

        if (created == 0 && updated == 0 && skipped > 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "All telemetry entries failed validation or persistence"
            );
        }

        return new SyncTelemetryResponse(created, updated, request.entries().size(), skipped);
    }

    private boolean upsertTelemetry(GameTelemetryPayload payload) {
        validatePayload(payload);

        GameTelemetry telemetry = gameTelemetryRepository.findByGameSlug(payload.gameSlug())
                .orElseGet(() -> GameTelemetry.builder()
                        .gameSlug(payload.gameSlug())
                        .build());

        boolean isNew = telemetry.getId() == null;
        TelemetrySource dataSource = resolveDataSource(payload);
        LocalDateTime checkedAt = LocalDateTime.now();

        telemetry.setStatus(payload.status());
        telemetry.setLatencyMs(payload.latencyMs());
        telemetry.setDataSource(dataSource);
        telemetry.setLastChecked(checkedAt);

        gameTelemetryRepository.save(telemetry);
        appendHistorySnapshot(payload.gameSlug(), payload.status(), dataSource, checkedAt);
        return isNew;
    }

    private void appendHistorySnapshot(
            String gameSlug,
            TelemetryStatus status,
            TelemetrySource dataSource,
            LocalDateTime checkedAt
    ) {
        gameTelemetryHistoryRepository.save(GameTelemetryHistory.builder()
                .gameSlug(gameSlug)
                .status(status)
                .dataSource(dataSource)
                .checkedAt(checkedAt)
                .build());
    }

    private void validateGameSlug(String gameSlug) {
        if (gameSlug == null || gameSlug.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "game query parameter is required"
            );
        }
    }

    private void validatePayload(GameTelemetryPayload payload) {
        if (payload.gameSlug() == null || payload.gameSlug().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "gameSlug is required for telemetry sync"
            );
        }

        if (payload.status() == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "status is required for telemetry sync"
            );
        }

        if (payload.latencyMs() == null || payload.latencyMs() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "latencyMs must be zero or greater"
            );
        }
    }

    private TelemetrySource resolveDataSource(GameTelemetryPayload payload) {
        if (payload.dataSource() != null) {
            return payload.dataSource();
        }

        return TelemetrySource.NETWORK_PROBE;
    }
}
