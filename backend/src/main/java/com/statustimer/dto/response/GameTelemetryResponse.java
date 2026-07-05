package com.statustimer.dto.response;

import com.statustimer.config.TrackedGameCatalog;
import com.statustimer.entity.Game;
import com.statustimer.entity.GameTelemetry;
import com.statustimer.entity.TelemetryStatus;
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
        LocalDate releaseDate
) {

    public static GameTelemetryResponse fromEntity(
            GameTelemetry entity,
            Optional<Game> game
    ) {
        String slug = entity.getGameSlug();
        TrackedGameCatalog.GameAssetMetadata catalog = TrackedGameCatalog.findBySlug(slug).orElse(null);

        String gameName = game.map(Game::getGameName)
                .orElseGet(() -> TrackedGameCatalog.resolveGameName(slug));

        Integer appId = catalog != null ? catalog.appId() : null;
        String logoUrl = TrackedGameCatalog.resolveLogoUrl(
                slug,
                appId,
                game.map(Game::getLogoUrl).orElse(null)
        );
        String coverUrl = TrackedGameCatalog.resolveCoverUrl(
                slug,
                appId,
                game.map(Game::getImageUrl).orElse(null)
        );

        LocalDate releaseDate = game
                .flatMap(TrackedGameCatalogHelper::resolveEarliestReleaseDate)
                .or(() -> TrackedGameCatalogHelper.resolveCatalogReleaseDate(slug))
                .orElse(null);
        boolean isUpcoming = entity.getStatus() == TelemetryStatus.UPCOMING
                || (releaseDate != null && releaseDate.isAfter(LocalDate.now()));

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
                releaseDate
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
