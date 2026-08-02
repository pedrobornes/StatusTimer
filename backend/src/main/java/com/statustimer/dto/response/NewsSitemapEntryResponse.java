package com.statustimer.dto.response;

import com.statustimer.entity.GamingNews;
import java.time.LocalDateTime;

public record NewsSitemapEntryResponse(
        String slug,
        LocalDateTime publishedAt
) {

    public static NewsSitemapEntryResponse fromEntity(GamingNews entity) {
        String slug = entity.getNewsSlug();
        if (slug == null || slug.isBlank()) {
            slug = entity.getId() != null ? "news-" + entity.getId() : "news";
        }

        LocalDateTime publishedAt = entity.getPublishedAt() != null
                ? entity.getPublishedAt()
                : entity.getCreatedAt();

        return new NewsSitemapEntryResponse(slug, publishedAt);
    }
}
