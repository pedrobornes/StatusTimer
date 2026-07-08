package com.statustimer.dto.response;

import com.statustimer.entity.GamingNews;
import com.statustimer.service.GameCatalogService;
import java.time.LocalDateTime;

public record GamingNewsResponse(
        Long id,
        String slug,
        String title,
        String content,
        String gameTag,
        String gameName,
        String gameCoverUrl,
        LocalDateTime createdAt,
        LocalDateTime publishedAt
) {

    public static GamingNewsResponse fromEntity(
            GamingNews entity,
            GameCatalogService catalogService
    ) {
        LocalDateTime publishedAt = entity.getPublishedAt() != null
                ? entity.getPublishedAt()
                : entity.getCreatedAt();
        String gameTag = resolveGameTag(entity);

        return new GamingNewsResponse(
                entity.getId(),
                resolveSlug(entity),
                entity.getTitle(),
                entity.getContent(),
                gameTag,
                catalogService.resolveGameName(gameTag),
                catalogService.resolveCoverUrl(gameTag, null),
                entity.getCreatedAt(),
                publishedAt
        );
    }

    private static String resolveSlug(GamingNews entity) {
        if (entity.getNewsSlug() != null && !entity.getNewsSlug().isBlank()) {
            return entity.getNewsSlug();
        }

        if (entity.getId() != null) {
            return "news-" + entity.getId();
        }

        return "news";
    }

    private static String resolveGameTag(GamingNews entity) {
        if (entity.getGame() != null && entity.getGame().getSlug() != null) {
            return entity.getGame().getSlug();
        }
        return entity.getGameTag() != null ? entity.getGameTag() : "";
    }
}
