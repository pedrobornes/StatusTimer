package com.statustimer.service;

import com.statustimer.dto.request.GameTelemetryPayload;
import com.statustimer.dto.request.SyncTelemetryRequest;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.SyncTelemetryResponse;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.repository.GameTelemetryRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GameTelemetryService {

    private final GameTelemetryRepository gameTelemetryRepository;

    @Transactional(readOnly = true)
    public List<GameTelemetryResponse> findAll() {
        return gameTelemetryRepository.findAll().stream()
                .map(GameTelemetryResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public GameTelemetryResponse findByGameSlug(String gameSlug) {
        return gameTelemetryRepository.findByGameSlug(gameSlug)
                .map(GameTelemetryResponse::fromEntity)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Telemetry not found for slug: " + gameSlug
                ));
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

        for (GameTelemetryPayload payload : request.entries()) {
            boolean isNew = upsertTelemetry(payload);
            if (isNew) {
                created++;
            } else {
                updated++;
            }
        }

        return new SyncTelemetryResponse(created, updated, request.entries().size());
    }

    private boolean upsertTelemetry(GameTelemetryPayload payload) {
        validatePayload(payload);

        GameTelemetry telemetry = gameTelemetryRepository.findByGameSlug(payload.gameSlug())
                .orElseGet(() -> GameTelemetry.builder()
                        .gameSlug(payload.gameSlug())
                        .build());

        boolean isNew = telemetry.getId() == null;

        telemetry.setStatus(payload.status());
        telemetry.setLatencyMs(payload.latencyMs());
        telemetry.setDataSource(resolveDataSource(payload));
        telemetry.setLastChecked(LocalDateTime.now());

        gameTelemetryRepository.save(telemetry);
        return isNew;
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
