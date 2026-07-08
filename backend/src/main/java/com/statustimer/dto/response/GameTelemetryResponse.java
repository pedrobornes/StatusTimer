package com.statustimer.dto.response;

import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.service.GameCatalogService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public record GameTelemetryResponse(
        Long id,
        String gameSlug,
        String gameName,
        String status,
        Integer latencyMs,
        String dataSource,
        LocalDateTime lastChecked,
        Integer appId,
        String logoUrl,
        String coverUrl,
        Boolean isUpcoming,
        LocalDate releaseDate,
        Integer twitchRank,
        String twitchGameId,
        LocalDate steamReleaseDate,
        Boolean steamAdultContent,
        Long livePlayers,
        Long twitchViewers,
        Boolean isIndexable,
        String lifecycleState,
        Integer userRating,
        Integer criticRating,
        String genreName,
        List<String> genreNames,
        List<String> screenshotUrls,
        List<String> trailerVideoIds
) {

    public static GameTelemetryResponse fromEntity(
            GameTelemetry entity,
            Optional<Game> game,
            GameCatalogService catalogService
    ) {
        String slug = entity.getGame().getSlug();

        String gameName = game.map(Game::getGameName)
                .orElseGet(() -> catalogService.resolveGameName(slug));

        Integer appId = catalogService.resolveAppId(slug);
        String logoUrl = catalogService.resolveLogoUrl(
                slug,
                game.map(Game::getLogoUrl).orElse(null)
        );
        String coverUrl = catalogService.resolveCoverUrl(
                slug,
                game.map(Game::getImageUrl).orElse(null)
        );

        LocalDate releaseDate = game
                .flatMap(TrackedGameCatalogHelper::resolveEarliestReleaseDate)
                .orElse(null);
        boolean isUpcoming = entity.getStatus() == TelemetryStatus.UPCOMING
                || (releaseDate != null && releaseDate.isAfter(LocalDate.now()));
        Integer twitchRank = catalogService.resolveTwitchRank(slug);
        String twitchGameId = catalogService.resolveTwitchGameId(slug);
        LocalDate steamReleaseDate = catalogService.resolveSteamReleaseDate(slug);
        boolean steamAdultContent = catalogService.isSteamAdultContent(slug);
        Long livePlayers = catalogService.resolveLivePlayers(slug);
        Long twitchViewers = catalogService.resolveTwitchViewers(slug);
        boolean isIndexable = catalogService.findBySlug(slug)
                .map(trackedGame -> Boolean.TRUE.equals(trackedGame.getIsIndexable()))
                .orElse(false);
        String lifecycleState = catalogService.findBySlug(slug)
                .map(trackedGame -> trackedGame.getLifecycleState().name())
                .orElse("CATALOG");
        Optional<Game> trackedGame = catalogService.findBySlug(slug);
        Integer userRating = trackedGame.map(Game::getUserRating).orElse(null);
        Integer criticRating = trackedGame.map(Game::getCriticRating).orElse(null);
        String genreName = trackedGame.map(Game::getGenreName).orElse(null);
        List<String> genreNames = trackedGame
                .map(Game::getGenreNames)
                .filter(names -> names != null && !names.isEmpty())
                .map(List::copyOf)
                .orElseGet(() -> genreName != null && !genreName.isBlank()
                        ? List.of(genreName)
                        : List.of());
        List<String> screenshotUrls = trackedGame
                .map(Game::getScreenshotUrls)
                .filter(urls -> urls != null && !urls.isEmpty())
                .orElse(List.of());
        List<String> trailerVideoIds = trackedGame
                .map(Game::getTrailerVideoIds)
                .filter(ids -> ids != null && !ids.isEmpty())
                .orElse(List.of());

        return new GameTelemetryResponse(
                entity.getId(),
                slug,
                gameName,
                entity.getStatus().name(),
                entity.getLatencyMs(),
                entity.getDataSource().name(),
                entity.getLastChecked(),
                appId,
                logoUrl,
                coverUrl,
                isUpcoming,
                releaseDate,
                twitchRank,
                twitchGameId,
                steamReleaseDate,
                steamAdultContent,
                livePlayers,
                twitchViewers,
                isIndexable,
                lifecycleState,
                userRating,
                criticRating,
                genreName,
                genreNames,
                screenshotUrls,
                trailerVideoIds
        );
    }

    public static GameTelemetryResponse fromGameCatalog(Game game, GameCatalogService catalogService) {
        String slug = game.getSlug();
        String logoUrl = catalogService.resolveLogoUrl(slug, game.getLogoUrl());
        String coverUrl = catalogService.resolveCoverUrl(slug, game.getImageUrl());
        LocalDate releaseDate = game.getPlatforms().stream()
                .map(platform -> platform.getReleaseDate())
                .filter(date -> date != null)
                .min(LocalDate::compareTo)
                .orElse(null);
        boolean isUpcoming = releaseDate != null && releaseDate.isAfter(LocalDate.now());
        Integer appId = game.getSteamAppId() != null
                ? game.getSteamAppId()
                : catalogService.resolveAppId(slug);
        List<String> screenshotUrls = game.getScreenshotUrls() != null && !game.getScreenshotUrls().isEmpty()
                ? game.getScreenshotUrls()
                : List.of();
        List<String> trailerVideoIds = game.getTrailerVideoIds() != null && !game.getTrailerVideoIds().isEmpty()
                ? game.getTrailerVideoIds()
                : List.of();

        return new GameTelemetryResponse(
                game.getId(),
                slug,
                game.getGameName(),
                isUpcoming ? TelemetryStatus.UPCOMING.name() : TelemetryStatus.ONLINE.name(),
                0,
                com.statustimer.entity.TelemetrySource.NETWORK_PROBE.name(),
                game.getLastTelemetryAt(),
                appId,
                logoUrl,
                coverUrl,
                isUpcoming,
                releaseDate,
                game.getTwitchRank(),
                game.getTwitchGameId(),
                game.getSteamReleaseDate(),
                Boolean.TRUE.equals(game.getSteamAdultContent()),
                game.getLivePlayers(),
                game.getTwitchViewers(),
                Boolean.TRUE.equals(game.getIsIndexable()),
                game.getLifecycleState().name(),
                game.getUserRating(),
                game.getCriticRating(),
                game.getGenreName(),
                game.getGenreNames() != null && !game.getGenreNames().isEmpty()
                        ? List.copyOf(game.getGenreNames())
                        : (game.getGenreName() != null && !game.getGenreName().isBlank()
                                ? List.of(game.getGenreName())
                                : List.of()),
                screenshotUrls,
                trailerVideoIds
        );
    }

    private static final class TrackedGameCatalogHelper {
        private TrackedGameCatalogHelper() {
        }

        private static Optional<LocalDate> resolveEarliestReleaseDate(Game game) {
            return game.getPlatforms().stream()
                    .map(platform -> platform.getReleaseDate())
                    .filter(date -> date != null)
                    .min(LocalDate::compareTo);
        }
    }
}
