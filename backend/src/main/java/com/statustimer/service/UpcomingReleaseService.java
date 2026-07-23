package com.statustimer.service;

import com.statustimer.config.CacheConfig;
import com.statustimer.config.CatalogMatureContentPolicy;
import com.statustimer.config.GameSlugMapper;
import com.statustimer.dto.response.UpcomingReleaseResponse;
import com.statustimer.entity.Game;
import com.statustimer.repository.GameRepository;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UpcomingReleaseService {

    private final GameRepository gameRepository;
    private final CatalogActivationService catalogActivationService;
    private final GameSlugMapper gameSlugMapper;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE, key = "'upcomingReleases'")
    public List<UpcomingReleaseResponse> findAll() {
        LocalDate today = LocalDate.now();

        return gameRepository.findAll().stream()
                .filter(game -> !CatalogMatureContentPolicy.shouldSkipCatalogSurfacing(game))
                .filter(game -> game.isUpcomingRelease(today))
                .sorted(Comparator.comparing(
                        game -> game.resolveEarliestKnownReleaseDate().orElse(LocalDate.MAX)
                ))
                .map(UpcomingReleaseResponse::fromEntity)
                .toList();
    }

    @Transactional
    public Optional<UpcomingReleaseResponse> findBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }

        String canonicalSlug = gameSlugMapper.resolveCanonicalSlug(slug.trim());
        if (canonicalSlug == null || canonicalSlug.isBlank()) {
            return Optional.empty();
        }

        // Materialize from IGDB when the title is not in catalog yet so
        // /status/{slug} can rescue to /release/{slug} for real upcoming games.
        catalogActivationService.activateOnDemand(canonicalSlug);

        LocalDate today = LocalDate.now();
        return gameRepository.findBySlug(canonicalSlug)
                .filter(game -> !CatalogMatureContentPolicy.shouldSkipCatalogSurfacing(game))
                .filter(game -> game.isReleaseProfileCandidate(today))
                .map(UpcomingReleaseResponse::fromEntity);
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE, allEntries = true)
    public UpcomingReleaseResponse incrementHype(Long id) {
        Game game = gameRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Upcoming release not found"
                ));

        game.setHypeCount(game.getHypeCount() + 1);
        return UpcomingReleaseResponse.fromEntity(gameRepository.save(game));
    }
}
