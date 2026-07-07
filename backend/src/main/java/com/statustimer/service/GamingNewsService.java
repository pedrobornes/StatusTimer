package com.statustimer.service;

import com.statustimer.dto.request.CreateGamingNewsRequest;
import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GamingNews;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GamingNewsRepository;
import com.statustimer.util.SlugUtils;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GamingNewsService {

    private final GamingNewsRepository gamingNewsRepository;
    private final GameRepository gameRepository;
    private final GameCatalogService gameCatalogService;

    @Transactional(readOnly = true)
    public List<GamingNewsResponse> findLatest() {
        return gamingNewsRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(entity -> GamingNewsResponse.fromEntity(entity, gameCatalogService))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GamingNewsResponse> findByGameTag(String gameTag, int limit) {
        String canonicalSlug = gameTag == null ? "" : gameTag.trim();
        List<GamingNews> linked = gamingNewsRepository.findByGame_SlugOrderByCreatedAtDesc(
                canonicalSlug,
                Pageable.ofSize(limit)
        );

        if (!linked.isEmpty()) {
            return linked.stream()
                .map(entity -> GamingNewsResponse.fromEntity(entity, gameCatalogService))
                .toList();
        }

        return gamingNewsRepository
                .findByGameTagOrderByCreatedAtDesc(canonicalSlug, Pageable.ofSize(limit))
                .stream()
                .map(entity -> GamingNewsResponse.fromEntity(entity, gameCatalogService))
                .toList();
    }

    @Transactional
    public GamingNewsResponse create(CreateGamingNewsRequest request) {
        LocalDateTime ingestedAt = LocalDateTime.now();
        String baseSlug = SlugUtils.toSlug(request.gameTag() + "-" + request.title());
        String resolvedSlug = reserveUniqueNewsSlug(baseSlug);
        Game linkedGame = resolveLinkedGame(request.gameTag());

        return GamingNewsResponse.fromEntity(
                gamingNewsRepository.save(request.toEntity(ingestedAt, resolvedSlug, linkedGame)),
                gameCatalogService
        );
    }

    @Transactional(readOnly = true)
    public GamingNewsResponse findById(Long id) {
        GamingNews entity = gamingNewsRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "News item not found: id=" + id
                ));

        return GamingNewsResponse.fromEntity(entity, gameCatalogService);
    }

    @Transactional(readOnly = true)
    public GamingNewsResponse findBySlug(String slug) {
        GamingNews entity = gamingNewsRepository.findByNewsSlug(slug)
                .or(() -> tryResolveLegacySlug(slug))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "News item not found: slug=" + slug
                ));

        return GamingNewsResponse.fromEntity(entity, gameCatalogService);
    }

    private String reserveUniqueNewsSlug(String baseSlug) {
        String normalizedBase = baseSlug == null || baseSlug.isBlank() ? "news" : baseSlug;
        String candidate = normalizedBase;
        int suffix = 2;

        while (gamingNewsRepository.existsByNewsSlug(candidate)) {
            candidate = normalizedBase + "-" + suffix;
            suffix++;
        }

        return candidate;
    }

    private java.util.Optional<GamingNews> tryResolveLegacySlug(String slug) {
        if (slug == null || !slug.startsWith("news-")) {
            return java.util.Optional.empty();
        }

        String rawId = slug.substring("news-".length()).trim();
        if (!rawId.matches("\\d+")) {
            return java.util.Optional.empty();
        }

        return gamingNewsRepository.findById(Long.valueOf(rawId));
    }

    private Game resolveLinkedGame(String gameTag) {
        String normalized = SlugUtils.toSlug(gameTag);
        if (normalized.isBlank()) {
            return null;
        }

        return gameRepository.findBySlug(normalized).orElse(null);
    }
}
