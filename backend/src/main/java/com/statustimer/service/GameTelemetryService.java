package com.statustimer.service;

import com.statustimer.config.GameSlugMapper;
import com.statustimer.dto.request.GameTelemetryPayload;
import com.statustimer.dto.request.SyncTelemetryRequest;
import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.SyncTelemetryResponse;
import com.statustimer.dto.response.TelemetryHistorySnapshotResponse;
import com.statustimer.dto.response.TelemetryIncidentResponse;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.GameTelemetryHistory;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.ScrapeJobStatus;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.entity.TrackedGame;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryRepository;
import com.statustimer.repository.TrackedGameRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameTelemetryService {

    private static final int DASHBOARD_TELEMETRY_CANDIDATE_LIMIT = 24;
    private static final List<TelemetryStatus> INCIDENT_STATUSES = List.of(
            TelemetryStatus.DOWN,
            TelemetryStatus.MAINTENANCE
    );

    private final GameTelemetryRepository gameTelemetryRepository;
    private final GameRepository gameRepository;
    private final GameCatalogService gameCatalogService;
    private final TrackedGameRepository trackedGameRepository;
    private final GameSlugMapper gameSlugMapper;
    private final IndexabilityService indexabilityService;
    private final CatalogActivationService catalogActivationService;
    private final ScrapeJobService scrapeJobService;
    private final TelemetryHistoryService telemetryHistoryService;
    private final HarvestScheduleService harvestScheduleService;

    @Transactional(readOnly = true)
    public List<GameTelemetryResponse> findAll() {
        return gameTelemetryRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GameTelemetryResponse> findAllFeatured() {
        return gameTelemetryRepository.findAll().stream()
                .filter(entity -> gameCatalogService.isFeatured(entity.getGameSlug()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GameTelemetryResponse> findDashboardTopGames(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 12));
        List<String> candidateSlugs = new ArrayList<>();

        trackedGameRepository
                .findByTwitchRankNotNullOrderByTwitchRankAsc(
                        PageRequest.of(0, DASHBOARD_TELEMETRY_CANDIDATE_LIMIT)
                )
                .stream()
                .map(TrackedGame::getSlug)
                .forEach(candidateSlugs::add);

        gameTelemetryRepository.findAll().stream()
                .map(GameTelemetry::getGameSlug)
                .filter(slug -> !candidateSlugs.contains(slug))
                .filter(gameCatalogService::isFeatured)
                .forEach(candidateSlugs::add);

        return candidateSlugs.stream()
                .map(gameTelemetryRepository::findByGameSlug)
                .flatMap(java.util.Optional::stream)
                .filter(entity -> entity.getStatus() != TelemetryStatus.UPCOMING)
                .map(this::toResponse)
                .limit(safeLimit)
                .toList();
    }

    @Transactional
    public List<GameTelemetryResponse> search(String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty()) {
            return findAll();
        }

        List<GameCatalogSearchResponse> catalogMatches = gameCatalogService.search(trimmed);
        if (catalogMatches.isEmpty()) {
            return List.of();
        }

        Set<String> matchingSlugs = catalogMatches.stream()
                .map(GameCatalogSearchResponse::slug)
                .collect(Collectors.toSet());

        for (String slug : matchingSlugs) {
            ensureTelemetryStub(slug);
        }

        return gameTelemetryRepository.findAll().stream()
                .filter(entity -> matchingSlugs.contains(entity.getGameSlug()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<GameTelemetryResponse> findOptionalByGameSlug(String gameSlug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(gameSlug);
        return gameTelemetryRepository.findByGameSlug(canonicalSlug)
                .map(this::toResponse);
    }

    @Transactional
    public GameTelemetryResponse findByGameSlug(String gameSlug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(gameSlug);
        return gameTelemetryRepository.findByGameSlug(canonicalSlug)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Telemetry not found for slug: " + gameSlug
                ));
    }

    @Transactional
    public void consolidateSlugAliases() {
        gameSlugMapper.slugAliases().forEach((aliasSlug, canonicalSlug) -> {
            gameTelemetryRepository.findByGameSlug(aliasSlug).ifPresent(aliasTelemetry -> {
                if (gameTelemetryRepository.findByGameSlug(canonicalSlug).isPresent()) {
                    gameTelemetryRepository.delete(aliasTelemetry);
                }
            });

            trackedGameRepository.findBySlug(aliasSlug).ifPresent(aliasGame -> {
                if (trackedGameRepository.findBySlug(canonicalSlug).isPresent()) {
                    trackedGameRepository.delete(aliasGame);
                }
            });
        });
    }

    @Transactional(readOnly = true)
    public List<TelemetryHistorySnapshotResponse> findHistoryByGameSlug(String gameSlug) {
        validateGameSlug(gameSlug);
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(gameSlug);

        LocalDateTime since = telemetryHistoryService.historyReadWindowStart();

        return gameTelemetryRepository.findHistoryByGameSlugSince(canonicalSlug, since).stream()
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
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(gameSlug);

        return gameTelemetryRepository
                .findRecentIncidentsByGameSlug(canonicalSlug, INCIDENT_STATUSES, pageable)
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

    @Transactional
    public void ensureTelemetryStub(String gameSlug) {
        if (gameSlug == null || gameSlug.isBlank()) {
            return;
        }

        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(gameSlug);

        if (gameTelemetryRepository.findByGameSlug(canonicalSlug).isPresent()) {
            return;
        }

        LocalDateTime checkedAt = LocalDateTime.now();
        gameTelemetryRepository.save(GameTelemetry.builder()
                .gameSlug(canonicalSlug)
                .status(TelemetryStatus.ONLINE)
                .latencyMs(0)
                .dataSource(TelemetrySource.STATUS_PAGE)
                .lastChecked(checkedAt)
                .build());
        appendHistorySnapshotIfNeeded(
                canonicalSlug,
                TelemetryStatus.ONLINE,
                TelemetrySource.STATUS_PAGE,
                checkedAt
        );
    }

    private GameTelemetryResponse toResponse(GameTelemetry entity) {
        return GameTelemetryResponse.fromEntity(
                entity,
                gameRepository.findBySlug(entity.getGameSlug()),
                gameCatalogService
        );
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
        appendHistorySnapshotIfNeeded(payload.gameSlug(), payload.status(), dataSource, checkedAt);
        touchTrackedGameAfterTelemetry(payload.gameSlug(), checkedAt);
        return isNew;
    }

    private void touchTrackedGameAfterTelemetry(String gameSlug, LocalDateTime checkedAt) {
        trackedGameRepository.findBySlug(gameSlug).ifPresent(game -> {
            game.setLastTelemetryAt(checkedAt);
            game.setInitialTelemetryReady(true);

            if (game.getFirstMonitoredAt() == null) {
                game.setFirstMonitoredAt(checkedAt);
            }

            if (game.getLifecycleState() == LifecycleState.CATALOG) {
                game.setLifecycleState(LifecycleState.MONITORED);
            }

            trackedGameRepository.save(game);
            catalogActivationService.markTelemetryReady(gameSlug);
            scrapeJobService.completeRunningJobsForSlug(gameSlug, ScrapeJobStatus.DONE);
            harvestScheduleService.recordTelemetrySuccess(gameSlug);
            indexabilityService.recalculateForSlug(gameSlug);
        });
    }

    private void appendHistorySnapshotIfNeeded(
            String gameSlug,
            TelemetryStatus status,
            TelemetrySource dataSource,
            LocalDateTime checkedAt
    ) {
        telemetryHistoryService.appendSnapshotIfNeeded(gameSlug, status, dataSource, checkedAt);
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
