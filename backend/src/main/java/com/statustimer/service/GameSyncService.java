package com.statustimer.service;

import com.statustimer.dto.request.GameReleasePayload;
import com.statustimer.dto.request.PlatformReleasePayload;
import com.statustimer.dto.request.SyncGamesRequest;
import com.statustimer.dto.response.SyncGamesResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GamePlatform;
import com.statustimer.entity.GamePlatformDetail;
import com.statustimer.repository.GameRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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

    private static final int MAX_IMAGE_URL_LENGTH = 2048;

    private final GameRepository gameRepository;

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
        Game game = gameRepository.findBySlug(payload.slug())
                .orElseGet(() -> Game.builder()
                        .slug(payload.slug())
                        .hypeCount(resolveInitialHypeCount(payload.hypeCount()))
                        .build());

        boolean isNew = game.getId() == null;

        game.setGameName(payload.gameName());
        game.setGenre(payload.genre());
        game.setImageUrl(resolveImageUrl(payload.imageUrl()));

        if (isNew) {
            game.setHypeCount(resolveInitialHypeCount(payload.hypeCount()));
        }

        syncPlatforms(game, payload.platforms());
        gameRepository.save(game);
        return isNew;
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

    private String resolveImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return null;
        }

        String trimmedUrl = imageUrl.trim();
        if (trimmedUrl.length() > MAX_IMAGE_URL_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "imageUrl must be " + MAX_IMAGE_URL_LENGTH + " characters or fewer"
            );
        }

        return trimmedUrl;
    }
}
