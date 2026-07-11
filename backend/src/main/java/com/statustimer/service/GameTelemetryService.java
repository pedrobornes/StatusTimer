package com.statustimer.service;

import com.statustimer.config.CatalogMatureContentPolicy;
import com.statustimer.config.CatalogNoisePolicy;
import com.statustimer.config.CacheConfig;
import com.statustimer.config.GameSlugMapper;
import com.statustimer.dto.request.GameTelemetryPayload;
import com.statustimer.dto.request.SyncTelemetryRequest;
import com.statustimer.dto.response.GameCatalogPageResponse;
import com.statustimer.dto.response.GameCatalogSearchResponse;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.SyncTelemetryResponse;
import com.statustimer.dto.response.TelemetryHistorySnapshotResponse;
import com.statustimer.dto.response.TelemetryIncidentResponse;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.LifecycleState;
import com.statustimer.entity.ScrapeJobStatus;
import com.statustimer.entity.TelemetrySource;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.entity.Game;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GameTelemetryRepository;
import com.statustimer.entity.GameTelemetryHistory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameTelemetryService {

    private static final int RECENT_INCIDENT_FETCH_LIMIT = 20;
    private static final int RECENT_INCIDENT_RESPONSE_LIMIT = 5;
    private static final int PUBLIC_HISTORY_RESPONSE_LIMIT = 6;
    private static final int DASHBOARD_TELEMETRY_CANDIDATE_LIMIT = 50;
    private static final List<TelemetryStatus> INCIDENT_STATUSES = List.of(
            TelemetryStatus.DOWN,
            TelemetryStatus.MAINTENANCE
    );

    private final GameTelemetryRepository gameTelemetryRepository;
    private final GameRepository gameRepository;
    private final GameCatalogService gameCatalogService;
    private final GameSlugMapper gameSlugMapper;
    private final IndexabilityService indexabilityService;
    private final CatalogActivationService catalogActivationService;
    private final ScrapeJobService scrapeJobService;
    private final TelemetryHistoryService telemetryHistoryService;
    private final HarvestScheduleService harvestScheduleService;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE)
    public List<GameTelemetryResponse> findAll() {
        return gameTelemetryRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE)
    public List<GameTelemetryResponse> findAllFeatured() {
        return gameTelemetryRepository.findAll().stream()
                .filter(entity -> gameCatalogService.isFeatured(entity.getGame().getSlug()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GameCatalogPageResponse findCatalogPage(int page, int size, String genre, String query) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 200));
        String normalizedGenre = normalizeCatalogGenre(genre);
        String normalizedQuery = normalizeCatalogQuery(query);

        Pageable pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(
                        Sort.Order.asc("twitchRank").nullsLast(),
                        Sort.Order.asc("gameName")
                )
        );

        Page<Game> gamesPage = gameRepository.findCatalogPage(
                normalizedGenre,
                normalizedQuery,
                pageable
        );

        List<String> slugs = gamesPage.getContent().stream()
                .map(Game::getSlug)
                .toList();

        Map<String, GameTelemetry> telemetryBySlug = slugs.isEmpty()
                ? Map.of()
                : gameTelemetryRepository.findByGame_SlugIn(slugs).stream()
                        .collect(Collectors.toMap(
                                telemetry -> telemetry.getGame().getSlug(),
                                Function.identity(),
                                (left, right) -> left
                        ));

        List<GameTelemetryResponse> items = gamesPage.getContent().stream()
                .map(game -> {
                    GameTelemetry telemetry = telemetryBySlug.get(game.getSlug());
                    return telemetry != null
                            ? GameTelemetryResponse.fromEntity(
                                    telemetry,
                                    Optional.of(game),
                                    gameCatalogService
                            )
                            : GameTelemetryResponse.fromGameCatalog(game, gameCatalogService);
                })
                .toList();

        return new GameCatalogPageResponse(
                items,
                safePage,
                safeSize,
                gamesPage.getTotalElements(),
                gamesPage.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE)
    public List<GameTelemetryResponse> findDashboardTopGames(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 6));
        List<String> candidateSlugs = new ArrayList<>();

        gameRepository
                .findByTwitchRankNotNullOrderByTwitchRankAsc(
                        PageRequest.of(0, DASHBOARD_TELEMETRY_CANDIDATE_LIMIT)
                )
                .stream()
                .map(Game::getSlug)
                .forEach(candidateSlugs::add);

        gameTelemetryRepository.findAll().stream()
                .map(entity -> entity.getGame().getSlug())
                .filter(slug -> !candidateSlugs.contains(slug))
                .filter(gameCatalogService::isFeatured)
                .forEach(candidateSlugs::add);

        return candidateSlugs.stream()
                .map(gameTelemetryRepository::findByGame_Slug)
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
                .filter(entity -> matchingSlugs.contains(entity.getGame().getSlug()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<GameTelemetryResponse> findOptionalByGameSlug(String gameSlug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(gameSlug);
        return gameTelemetryRepository.findByGame_Slug(canonicalSlug)
                .map(this::toResponse);
    }

    @Transactional
    public GameTelemetryResponse findByGameSlug(String gameSlug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(gameSlug);
        return gameTelemetryRepository.findByGame_Slug(canonicalSlug)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Telemetry not found for slug: " + gameSlug
                ));
    }

    @Transactional
    public void consolidateSlugAliases() {
        gameSlugMapper.slugAliases().forEach((aliasSlug, canonicalSlug) -> {
            gameTelemetryRepository.findByGame_Slug(aliasSlug).ifPresent(aliasTelemetry -> {
                if (gameTelemetryRepository.findByGame_Slug(canonicalSlug).isPresent()) {
                    gameTelemetryRepository.delete(aliasTelemetry);
                }
            });

            gameRepository.findBySlug(aliasSlug).ifPresent(aliasGame -> {
                if (gameRepository.findBySlug(canonicalSlug).isPresent()) {
                    gameRepository.delete(aliasGame);
                }
            });
        });
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.PUBLIC_READ_SHORT_CACHE)
    public List<TelemetryHistorySnapshotResponse> findHistoryByGameSlug(String gameSlug) {
        validateGameSlug(gameSlug);
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(gameSlug);

        LocalDateTime since = telemetryHistoryService.historyReadWindowStart();

        List<TelemetryHistorySnapshotResponse> history = gameTelemetryRepository
                .findHistoryByGameSlugSince(canonicalSlug, since)
                .stream()
                .map(TelemetryHistorySnapshotResponse::fromEntity)
                .toList();

        if (history.size() <= PUBLIC_HISTORY_RESPONSE_LIMIT) {
            return history;
        }

        return history.subList(
                history.size() - PUBLIC_HISTORY_RESPONSE_LIMIT,
                history.size()
        );
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.PUBLIC_READ_SHORT_CACHE)
    public List<TelemetryIncidentResponse> findRecentIncidents() {
        LocalDate today = LocalDate.now();

        return gameTelemetryRepository
                .findRecentIncidents(
                        INCIDENT_STATUSES,
                        PageRequest.of(0, RECENT_INCIDENT_FETCH_LIMIT)
                )
                .stream()
                .filter(history -> isIncidentEligible(history, today))
                .limit(RECENT_INCIDENT_RESPONSE_LIMIT)
                .map(TelemetryIncidentResponse::fromEntity)
                .toList();
    }

    private boolean isIncidentEligible(GameTelemetryHistory history, LocalDate today) {
        Game game = history.getGame();
        if (game == null) {
            return false;
        }

        if (CatalogMatureContentPolicy.shouldSkipCatalogSurfacing(game)) {
            return false;
        }

        if (CatalogNoisePolicy.shouldSkipCatalogSurfacing(game)) {
            return false;
        }

        return !game.isUpcomingRelease(today);
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
    @CacheEvict(
            cacheNames = {
                    CacheConfig.PUBLIC_READ_SHORT_CACHE,
                    CacheConfig.PUBLIC_READ_MEDIUM_CACHE
            },
            allEntries = true
    )
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

        if (gameTelemetryRepository.findByGame_Slug(canonicalSlug).isPresent()) {
            return;
        }

        Game game = gameRepository.findBySlug(canonicalSlug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Game not found for telemetry slug: " + canonicalSlug
                ));
        LocalDateTime checkedAt = LocalDateTime.now();
        gameTelemetryRepository.save(GameTelemetry.builder()
                .game(game)
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
                Optional.ofNullable(entity.getGame()),
                gameCatalogService
        );
    }

    private boolean upsertTelemetry(GameTelemetryPayload payload) {
        validatePayload(payload);

        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(payload.gameSlug());
        Game game = gameRepository.findBySlug(canonicalSlug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Unknown game slug for telemetry sync: " + canonicalSlug
                ));
        GameTelemetry telemetry = gameTelemetryRepository.findByGame_Slug(canonicalSlug)
                .orElseGet(() -> GameTelemetry.builder()
                        .game(game)
                        .build());

        boolean isNew = telemetry.getId() == null;
        TelemetrySource dataSource = resolveDataSource(payload);
        LocalDateTime checkedAt = LocalDateTime.now();
        TelemetryStatus resolvedStatus = resolveIncomingStatus(game, payload);
        boolean suppressIncidentHistory = shouldSuppressIncidentHistory(game, resolvedStatus, payload);

        telemetry.setStatus(resolvedStatus);
        telemetry.setLatencyMs(payload.latencyMs());
        telemetry.setDataSource(dataSource);
        telemetry.setLastChecked(checkedAt);
        telemetry.setGame(game);

        gameTelemetryRepository.save(telemetry);
        if (!suppressIncidentHistory) {
            appendHistorySnapshotIfNeeded(canonicalSlug, resolvedStatus, dataSource, checkedAt);
        }
        touchTrackedGameAfterTelemetry(canonicalSlug, checkedAt);
        return isNew;
    }

    private TelemetryStatus resolveIncomingStatus(Game game, GameTelemetryPayload payload) {
        if (Boolean.TRUE.equals(payload.isUpcoming()) || game.isUpcomingRelease(LocalDate.now())) {
            return TelemetryStatus.UPCOMING;
        }

        return payload.status();
    }

    private boolean shouldSuppressIncidentHistory(
            Game game,
            TelemetryStatus resolvedStatus,
            GameTelemetryPayload payload
    ) {
        if (resolvedStatus == TelemetryStatus.UPCOMING) {
            return true;
        }

        if (!game.isUpcomingRelease(LocalDate.now())) {
            return false;
        }

        return payload.status() == TelemetryStatus.DOWN
                || payload.status() == TelemetryStatus.MAINTENANCE;
    }

    private void touchTrackedGameAfterTelemetry(String gameSlug, LocalDateTime checkedAt) {
        gameRepository.findBySlug(gameSlug).ifPresent(game -> {
            game.setLastTelemetryAt(checkedAt);
            game.setInitialTelemetryReady(true);

            if (game.getFirstMonitoredAt() == null) {
                game.setFirstMonitoredAt(checkedAt);
            }

            gameRepository.save(game);
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

    private String normalizeCatalogGenre(String genre) {
        if (genre == null) {
            return null;
        }

        String trimmed = genre.trim();
        if (trimmed.isEmpty() || "all".equalsIgnoreCase(trimmed)) {
            return null;
        }

        return trimmed;
    }

    private String normalizeCatalogQuery(String query) {
        if (query == null) {
            return null;
        }

        String trimmed = query.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
