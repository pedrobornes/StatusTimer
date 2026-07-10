package com.statustimer.service;

import com.statustimer.config.CatalogMonitoringPolicy;
import com.statustimer.config.CatalogMatureContentPolicy;
import com.statustimer.config.GameSlugMapper;
import com.statustimer.dto.response.GameStatusDetailResponse;
import com.statustimer.dto.response.GameTelemetryResponse;
import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.dto.response.SteamStoreListingResponse;
import com.statustimer.dto.response.TelemetryHistorySnapshotResponse;
import com.statustimer.dto.response.TelemetryIncidentResponse;
import com.statustimer.dto.response.TelemetryUptimeSummaryResponse;
import com.statustimer.entity.Game;
import com.statustimer.repository.GameRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

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
    private final GameCatalogService gameCatalogService;
    private final GameSlugMapper gameSlugMapper;

    @Transactional
    public GameStatusDetailResponse findByGameSlug(String slug) {
        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug);
        if (CatalogMatureContentPolicy.containsBannedWord(canonicalSlug)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Game not found for slug: " + slug
            );
        }

        Optional<Game> existingGame = gameRepository.findBySlug(canonicalSlug);
        if (existingGame.isPresent()
                && CatalogMatureContentPolicy.shouldSkipCatalogSurfacing(existingGame.get())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Game not found for slug: " + slug
            );
        }

        catalogActivationService.activateOnDemand(slug);

        Optional<Game> gameOpt = gameRepository.findBySlug(canonicalSlug);
        boolean catalogOnly = gameOpt.map(CatalogMonitoringPolicy::isCatalogOnlyProfile).orElse(false);
        boolean telemetryReady = catalogOnly || catalogActivationService.isTelemetryReady(slug);

        List<GamingNewsResponse> news = gamingNewsService.findByGameTag(slug, NEWS_LIMIT);
        LocalDateTime firstMonitoredAt = resolveFirstMonitoredAt(slug);
        SteamStoreListingResponse steamStore = gameCatalogService.resolveSteamStoreListing(slug);
        List<String> screenshotUrls = resolveScreenshotUrls(slug);
        List<String> trailerVideoIds = resolveTrailerVideoIds(slug);
        String youtubeChannelUrl = resolveYoutubeChannelUrl(slug);
        Map<String, String> externalLinks = resolveExternalLinks(slug);

        if (!telemetryReady) {
            GameTelemetryResponse partialTelemetry = resolvePartialTelemetry(slug).orElse(null);
            return new GameStatusDetailResponse(
                    gameCatalogService.resolveGameName(slug),
                    partialTelemetry,
                    List.of(),
                    List.of(),
                    news,
                    false,
                    firstMonitoredAt,
                    null,
                    steamStore,
                    screenshotUrls,
                    trailerVideoIds,
                    youtubeChannelUrl,
                    externalLinks,
                    false
            );
        }

        GameTelemetryResponse telemetry = resolveReadyTelemetry(slug, catalogOnly)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Game not found for slug: " + slug
                ));

        if (catalogOnly) {
            return new GameStatusDetailResponse(
                    gameCatalogService.resolveGameName(slug),
                    telemetry,
                    List.of(),
                    List.of(),
                    news,
                    true,
                    firstMonitoredAt,
                    null,
                    steamStore,
                    screenshotUrls,
                    trailerVideoIds,
                    youtubeChannelUrl,
                    externalLinks,
                    true
            );
        }

        return buildDetailResponse(
                telemetry,
                slug,
                true,
                news,
                firstMonitoredAt,
                steamStore,
                screenshotUrls,
                trailerVideoIds,
                youtubeChannelUrl,
                externalLinks
        );
    }

    private Optional<GameTelemetryResponse> resolveReadyTelemetry(String slug, boolean catalogOnly) {
        Optional<GameTelemetryResponse> probedTelemetry =
                gameTelemetryService.findOptionalByGameSlug(slug);

        if (probedTelemetry.isPresent() && !catalogOnly) {
            return probedTelemetry;
        }

        return resolvePartialTelemetry(slug);
    }

    private GameStatusDetailResponse buildDetailResponse(
            GameTelemetryResponse telemetry,
            String slug,
            boolean ready,
            List<GamingNewsResponse> news,
            LocalDateTime firstMonitoredAt,
            SteamStoreListingResponse steamStore,
            List<String> screenshotUrls,
            List<String> trailerVideoIds,
            String youtubeChannelUrl,
            Map<String, String> externalLinks
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
                gameCatalogService.resolveGameName(slug),
                telemetry,
                history,
                incidents,
                news,
                ready,
                firstMonitoredAt,
                uptime,
                steamStore,
                screenshotUrls,
                trailerVideoIds,
                youtubeChannelUrl,
                externalLinks,
                false
        );
    }

    private List<String> resolveScreenshotUrls(String slug) {
        return gameCatalogService.findBySlug(slug)
                .map(Game::getScreenshotUrls)
                .filter(urls -> urls != null && !urls.isEmpty())
                .orElse(List.of());
    }

    private List<String> resolveTrailerVideoIds(String slug) {
        return gameCatalogService.findBySlug(slug)
                .map(Game::getTrailerVideoIds)
                .filter(ids -> ids != null && !ids.isEmpty())
                .orElse(List.of());
    }

    private String resolveYoutubeChannelUrl(String slug) {
        return gameCatalogService.findBySlug(slug)
                .map(Game::getYoutubeChannelUrl)
                .filter(url -> url != null && !url.isBlank())
                .orElse(null);
    }

    private Map<String, String> resolveExternalLinks(String slug) {
        return gameCatalogService.findBySlug(slug)
                .map(Game::getExternalLinks)
                .filter(links -> links != null && !links.isEmpty())
                .map(Map::copyOf)
                .orElse(Map.of());
    }

    private LocalDateTime resolveFirstMonitoredAt(String slug) {
        return gameRepository.findBySlug(slug)
                .map(game -> game.getFirstMonitoredAt())
                .orElse(null);
    }

    private Optional<GameTelemetryResponse> resolvePartialTelemetry(String slug) {
        Optional<GameTelemetryResponse> existingTelemetry =
                gameTelemetryService.findOptionalByGameSlug(slug);
        if (existingTelemetry.isPresent()) {
            return existingTelemetry;
        }

        return gameCatalogService.findBySlug(slug)
                .map(game -> GameTelemetryResponse.fromGameCatalog(game, gameCatalogService));
    }
}
