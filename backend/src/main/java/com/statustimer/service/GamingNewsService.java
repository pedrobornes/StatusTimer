package com.statustimer.service;

import com.statustimer.config.CacheConfig;
import com.statustimer.dto.request.CreateGamingNewsRequest;
import com.statustimer.dto.response.GamingNewsResponse;
import com.statustimer.entity.Game;
import com.statustimer.entity.GamingNews;
import com.statustimer.repository.GameRepository;
import com.statustimer.repository.GamingNewsRepository;
import com.statustimer.util.SlugUtils;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class GamingNewsService {

    private static final int MAX_ITEMS_PER_GAME_IN_LATEST = 2;
    /** Safety cap while legacy MySQL columns may still be TEXT (64 KB). */
    private static final int MAX_CONTENT_CHARS = 60_000;
    private static final Pattern NEWS_SLUG_NUMERIC_SUFFIX = Pattern.compile("-(\\d+)$");

    private final GamingNewsRepository gamingNewsRepository;
    private final GameRepository gameRepository;
    private final GameCatalogService gameCatalogService;

    @Transactional(readOnly = true)
    @Cacheable(
            cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE,
            key = "'gamingNewsLatest:' + (#scrapeTier != null ? #scrapeTier : 'all')"
    )
    public List<GamingNewsResponse> findLatest(Integer scrapeTier) {
        Set<String> tierSlugs = resolveTierSlugs(scrapeTier);
        Map<String, Integer> perGameCount = new HashMap<>();

        return gamingNewsRepository.findAllByOrderByCreatedAtDesc().stream()
                .sorted(Comparator.comparing(this::resolveSortTime).reversed())
                .filter(entity -> matchesScrapeTier(entity, tierSlugs))
                .collect(java.util.stream.Collectors.collectingAndThen(
                        java.util.stream.Collectors.toList(),
                        this::deduplicateNews
                ))
                .stream()
                .filter(entity -> {
                    String key = resolveGroupingKey(entity);
                    int current = perGameCount.getOrDefault(key, 0);
                    if (current >= MAX_ITEMS_PER_GAME_IN_LATEST) {
                        return false;
                    }
                    perGameCount.put(key, current + 1);
                    return true;
                })
                .map(entity -> GamingNewsResponse.fromEntity(entity, gameCatalogService))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<GamingNewsResponse> findByGameTag(String gameTag, int limit) {
        String canonicalSlug = gameTag == null ? "" : gameTag.trim();
        List<GamingNews> matches = gamingNewsRepository.findAllForGameSlug(
                canonicalSlug,
                canonicalSlug,
                Pageable.unpaged()
        );

        return deduplicateNews(matches).stream()
                .sorted(Comparator.comparing(this::resolveSortTime).reversed())
                .limit(limit)
                .map(entity -> GamingNewsResponse.fromEntity(entity, gameCatalogService))
                .toList();
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE, allEntries = true)
    public GamingNewsResponse create(CreateGamingNewsRequest request) {
        Optional<GamingNews> existing = findDuplicateNews(request.gameTag(), request.title());
        if (existing.isPresent()) {
            return GamingNewsResponse.fromEntity(existing.get(), gameCatalogService);
        }

        LocalDateTime ingestedAt = LocalDateTime.now();
        String baseSlug = buildNewsBaseSlug(request.gameTag(), request.title());
        String dedupKey = buildNewsDedupKey(request.gameTag(), request.title());
        Optional<GamingNews> baseSlugMatch = gamingNewsRepository.findByNewsSlug(baseSlug);
        if (baseSlugMatch.isPresent()
                && dedupKey.equals(buildNewsDedupKey(baseSlugMatch.get()))) {
            return GamingNewsResponse.fromEntity(baseSlugMatch.get(), gameCatalogService);
        }

        String resolvedSlug = baseSlugMatch.isPresent()
                ? reserveUniqueNewsSlug(baseSlug)
                : baseSlug;
        Game linkedGame = resolveLinkedGame(request.gameTag());
        CreateGamingNewsRequest normalized = new CreateGamingNewsRequest(
                request.title(),
                normalizeContent(request.content()),
                request.gameTag(),
                request.publishedAt()
        );

        return GamingNewsResponse.fromEntity(
                gamingNewsRepository.save(
                        normalized.toEntity(ingestedAt, resolvedSlug, linkedGame)
                ),
                gameCatalogService
        );
    }

    @Transactional
    @CacheEvict(cacheNames = CacheConfig.PUBLIC_READ_MEDIUM_CACHE, allEntries = true)
    public int reconcileDuplicateNews() {
        Map<String, GamingNews> keepers = new LinkedHashMap<>();
        List<GamingNews> duplicates = new ArrayList<>();

        for (GamingNews item : gamingNewsRepository.findAllByOrderByCreatedAtDesc()) {
            String dedupKey = buildNewsDedupKey(item);
            GamingNews existing = keepers.get(dedupKey);
            if (existing == null) {
                keepers.put(dedupKey, item);
                continue;
            }

            GamingNews preferred = pickPreferredDuplicate(existing, item);
            GamingNews duplicate = preferred == existing ? item : existing;
            keepers.put(dedupKey, preferred);
            duplicates.add(duplicate);
        }

        if (!duplicates.isEmpty()) {
            gamingNewsRepository.deleteAll(duplicates);
        }

        return duplicates.size();
    }

    private List<GamingNews> deduplicateNews(List<GamingNews> items) {
        Map<String, GamingNews> unique = new LinkedHashMap<>();

        items.stream()
                .sorted(Comparator.comparing(this::resolveSortTime).reversed())
                .forEach(item -> unique.putIfAbsent(buildNewsDedupKey(item), item));

        return new ArrayList<>(unique.values());
    }

    private Optional<GamingNews> findDuplicateNews(String gameTag, String title) {
        String normalizedTag = SlugUtils.toSlug(gameTag);
        String normalizedTitle = normalizeNewsTitle(title);
        if (normalizedTag.isBlank() || normalizedTitle.isBlank()) {
            return Optional.empty();
        }

        return gamingNewsRepository.findAllForGameSlug(
                        normalizedTag,
                        normalizedTag,
                        Pageable.unpaged()
                ).stream()
                .filter(item -> normalizedTitle.equals(normalizeNewsTitle(item.getTitle())))
                .max(Comparator.comparing(this::resolveSortTime));
    }

    private String buildNewsDedupKey(GamingNews entity) {
        return resolveGroupingKey(entity) + "|" + normalizeNewsTitle(entity.getTitle());
    }

    private String buildNewsDedupKey(String gameTag, String title) {
        String groupingKey = SlugUtils.toSlug(gameTag);
        if (groupingKey.isBlank()) {
            groupingKey = "unknown";
        }

        return groupingKey + "|" + normalizeNewsTitle(title);
    }

    private GamingNews pickPreferredDuplicate(GamingNews left, GamingNews right) {
        int leftPenalty = newsSlugSuffixPenalty(left.getNewsSlug());
        int rightPenalty = newsSlugSuffixPenalty(right.getNewsSlug());
        if (leftPenalty != rightPenalty) {
            return leftPenalty < rightPenalty ? left : right;
        }

        LocalDateTime leftTime = resolveSortTime(left);
        LocalDateTime rightTime = resolveSortTime(right);
        if (!leftTime.isEqual(rightTime)) {
            return leftTime.isAfter(rightTime) ? left : right;
        }

        long leftId = left.getId() == null ? Long.MIN_VALUE : left.getId();
        long rightId = right.getId() == null ? Long.MIN_VALUE : right.getId();
        return leftId < rightId ? left : right;
    }

    private int newsSlugSuffixPenalty(String slug) {
        if (slug == null || slug.isBlank()) {
            return Integer.MAX_VALUE;
        }

        Matcher matcher = NEWS_SLUG_NUMERIC_SUFFIX.matcher(slug);
        if (!matcher.find()) {
            return 0;
        }

        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException ignored) {
            return Integer.MAX_VALUE - 1;
        }
    }

    private String normalizeNewsTitle(String title) {
        if (title == null || title.isBlank()) {
            return "";
        }

        String normalized = Normalizer.normalize(title, Normalizer.Form.NFKD)
                .replaceAll("\\p{M}", "")
                .toLowerCase()
                .replaceAll("[!?.:;]+$", "")
                .replaceAll("\\s+", " ")
                .trim();

        return normalized;
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

    private String buildNewsBaseSlug(String gameTag, String title) {
        String normalizedTag = gameTag == null ? "" : gameTag.trim();
        String normalizedTitle = title == null ? "" : title.trim();
        String tagSlug = SlugUtils.toSlug(normalizedTag);
        String titleSlug = SlugUtils.toSlug(normalizedTitle);

        if (tagSlug.isBlank()) {
            return titleSlug.isBlank() ? "news" : titleSlug;
        }

        if (titleSlug.isBlank()) {
            return tagSlug;
        }

        if (titleSlug.equals(tagSlug) || titleSlug.startsWith(tagSlug + "-")) {
            return titleSlug;
        }

        return tagSlug + "-" + titleSlug;
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

    private LocalDateTime resolveSortTime(GamingNews entity) {
        return entity.getPublishedAt() != null ? entity.getPublishedAt() : entity.getCreatedAt();
    }

    private String resolveGroupingKey(GamingNews entity) {
        if (entity.getGame() != null && entity.getGame().getSlug() != null) {
            return entity.getGame().getSlug();
        }

        if (entity.getGameTag() != null && !entity.getGameTag().isBlank()) {
            return SlugUtils.toSlug(entity.getGameTag());
        }

        return "unknown";
    }

    private Set<String> resolveTierSlugs(Integer scrapeTier) {
        if (scrapeTier == null) {
            return null;
        }

        return new HashSet<>(gameRepository.findSlugsByScrapeTier(scrapeTier));
    }

    private boolean matchesScrapeTier(GamingNews entity, Set<String> tierSlugs) {
        if (tierSlugs == null) {
            return true;
        }

        return tierSlugs.contains(resolveGroupingKey(entity));
    }

    private String normalizeContent(String content) {
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "News content is required");
        }

        String trimmed = content.trim();
        if (trimmed.length() <= MAX_CONTENT_CHARS) {
            return trimmed;
        }

        return trimmed.substring(0, MAX_CONTENT_CHARS).trim();
    }
}
