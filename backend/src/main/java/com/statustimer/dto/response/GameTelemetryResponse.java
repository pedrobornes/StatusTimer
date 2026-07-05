package com.statustimer.dto.response;

import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.TelemetryStatus;
import com.statustimer.service.GameCatalogService;
import java.time.LocalDate;
import java.time.LocalDateTime;
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
        LocalDate steamReleaseDate,
        Boolean steamAdultContent,
        Long livePlayers,
        Long twitchViewers
) {

    public static GameTelemetryResponse fromEntity(
            GameTelemetry entity,
            Optional<Game> game,
            GameCatalogService catalogService
    ) {
        String slug = entity.getGameSlug();

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
                .or(() -> TrackedGameCatalogHelper.resolveCatalogReleaseDate(slug))
                .orElse(null);
        boolean isUpcoming = entity.getStatus() == TelemetryStatus.UPCOMING
                || (releaseDate != null && releaseDate.isAfter(LocalDate.now()));
        Integer twitchRank = catalogService.resolveTwitchRank(slug);
        LocalDate steamReleaseDate = catalogService.resolveSteamReleaseDate(slug);
        boolean steamAdultContent = catalogService.isSteamAdultContent(slug);
        Long livePlayers = catalogService.resolveLivePlayers(slug);
        Long twitchViewers = catalogService.resolveTwitchViewers(slug);

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
                steamReleaseDate,
                steamAdultContent,
                livePlayers,
                twitchViewers
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

        private static Optional<LocalDate> resolveCatalogReleaseDate(String slug) {
            if ("gta-vi".equals(slug)) {
                return Optional.of(LocalDate.of(2026, 11, 19));
            }
            return Optional.empty();
        }
    }
}
