package com.statustimer.service;

import com.statustimer.config.GameAssetPolicy;
import com.statustimer.config.GameSlugMapper;
import com.statustimer.dto.request.GameReleasePayload;
import com.statustimer.dto.request.PlatformReleasePayload;
import com.statustimer.dto.request.SyncGamesRequest;
import com.statustimer.dto.response.SyncGamesResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GamePlatform;
import com.statustimer.entity.GamePlatformDetail;
import com.statustimer.repository.GameRepository;
import com.statustimer.util.IgdbMetadataSupport;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GameSyncService {

    private static final int MAX_URL_LENGTH = 2048;

    private final GameRepository gameRepository;
    private final GameSlugMapper gameSlugMapper;

    @Transactional
    public SyncGamesResponse syncGames(SyncGamesRequest request) {
        if (request.releases() == null || request.releases().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one release payload is required"
            );
        }

        int created = 0;
        int updated = 0;

        for (GameReleasePayload payload : request.releases()) {
            boolean isNew = upsertGame(payload);
            if (isNew) {
                created++;
            } else {
                updated++;
            }
        }

        return new SyncGamesResponse(created, updated, request.releases().size());
    }

    private boolean upsertGame(GameReleasePayload payload) {
        String canonicalSlug = gameSlugMapper.getSteamSlug(payload.slug());
        Game game = resolveGameForUpsert(payload, canonicalSlug);

        boolean isNew = game.getId() == null;

        game.setGameName(payload.gameName());
        IgdbMetadataSupport.applyGenreNames(game, payload.genreNames());
        GameAssetPolicy.applyIgdbAssets(
                game,
                sanitizeIgdbUrl(payload.logoUrl(), "logoUrl"),
                sanitizeIgdbUrl(payload.imageUrl(), "imageUrl")
        );
        game.setImageUrl(sanitizeIgdbUrl(payload.imageUrl(), "imageUrl"));

        if (payload.steamAppId() != null && payload.steamAppId() > 0) {
            game.setSteamAppId(payload.steamAppId());
        }

        if (payload.hypeCount() != null && payload.hypeCount() >= 0) {
            game.setHypeCount(payload.hypeCount());
        } else if (isNew) {
            game.setHypeCount(0L);
        }

        IgdbMetadataSupport.applyToGame(
                game,
                payload.igdbGameId(),
                payload.userRating(),
                payload.criticRating(),
                payload.screenshotUrls(),
                payload.trailerVideoIds()
        );

        syncPlatforms(game, payload.platforms());
        gameRepository.save(game);
        return isNew;
    }

    private Game resolveGameForUpsert(GameReleasePayload payload, String canonicalSlug) {
        if (payload.igdbGameId() != null && payload.igdbGameId() > 0) {
            Optional<Game> byIgdbId = findPreferredGameByIgdbId(payload.igdbGameId());
            if (byIgdbId.isPresent()) {
                Game existing = byIgdbId.get();
                if (canonicalSlug != null
                        && !canonicalSlug.isBlank()
                        && !canonicalSlug.equals(existing.getSlug())
                        && gameRepository.findBySlug(canonicalSlug).isEmpty()) {
                    existing.setSlug(canonicalSlug);
                }
                return existing;
            }
        }

        Optional<Game> byCanonicalSlug = canonicalSlug == null || canonicalSlug.isBlank()
                ? Optional.empty()
                : gameRepository.findBySlug(canonicalSlug);
        if (byCanonicalSlug.isPresent()) {
            return byCanonicalSlug.get();
        }

        if (payload.slug() != null
                && !payload.slug().isBlank()
                && !payload.slug().equals(canonicalSlug)) {
            Optional<Game> byPayloadSlug = gameRepository.findBySlug(payload.slug());
            if (byPayloadSlug.isPresent()) {
                return byPayloadSlug.get();
            }
        }

        return Game.builder()
                .slug(canonicalSlug != null && !canonicalSlug.isBlank() ? canonicalSlug : payload.slug())
                .hypeCount(resolveInitialHypeCount(payload.hypeCount()))
                .build();
    }

    private Optional<Game> findPreferredGameByIgdbId(long igdbGameId) {
        List<Game> matches = gameRepository.findAllByIgdbGameId(igdbGameId);
        if (matches.isEmpty()) {
            return Optional.empty();
        }
        if (matches.size() == 1) {
            return Optional.of(matches.getFirst());
        }

        return matches.stream()
                .min(java.util.Comparator
                        .comparing((Game game) -> game.getHypeCount() == null ? 0L : game.getHypeCount(),
                                java.util.Comparator.reverseOrder())
                        .thenComparing(game -> game.getId() == null ? Long.MAX_VALUE : game.getId()))
                .map(Optional::of)
                .orElseGet(Optional::empty);
    }

    private void syncPlatforms(Game game, List<PlatformReleasePayload> platforms) {
        List<PlatformReleasePayload> validatedPlatforms = validatePlatforms(platforms);
        Map<GamePlatform, GamePlatformDetail> existingByPlatform = game.getPlatforms().stream()
                .collect(Collectors.toMap(GamePlatformDetail::getPlatform, detail -> detail));
        Set<GamePlatform> desiredPlatforms = new HashSet<>();

        for (PlatformReleasePayload platformPayload : validatedPlatforms) {
            desiredPlatforms.add(platformPayload.platform());
            GamePlatformDetail existingDetail = existingByPlatform.get(platformPayload.platform());

            if (existingDetail != null) {
                existingDetail.setReleaseDate(platformPayload.releaseDate());
                continue;
            }

            game.getPlatforms().add(GamePlatformDetail.builder()
                    .game(game)
                    .platform(platformPayload.platform())
                    .releaseDate(platformPayload.releaseDate())
                    .build());
        }

        game.getPlatforms().removeIf(detail -> !desiredPlatforms.contains(detail.getPlatform()));
    }

    private List<PlatformReleasePayload> validatePlatforms(List<PlatformReleasePayload> platforms) {
        if (platforms == null || platforms.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Each game must include at least one platform entry"
            );
        }

        return platforms;
    }

    private long resolveInitialHypeCount(Long hypeCount) {
        if (hypeCount == null || hypeCount < 0) {
            return 0L;
        }

        return hypeCount;
    }

    private String sanitizeIgdbUrl(String url, String fieldName) {
        String resolved = resolveOptionalUrl(url, fieldName);
        return GameAssetPolicy.sanitizeImageUrl(resolved);
    }

    private String resolveOptionalUrl(String url, String fieldName) {
        if (url == null || url.isBlank()) {
            return null;
        }

        String trimmedUrl = url.trim();
        if (trimmedUrl.length() > MAX_URL_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    fieldName + " must be " + MAX_URL_LENGTH + " characters or fewer"
            );
        }

        return trimmedUrl;
    }
}
