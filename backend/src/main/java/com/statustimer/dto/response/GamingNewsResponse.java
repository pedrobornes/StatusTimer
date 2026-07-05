package com.statustimer.dto.response;

import com.statustimer.entity.GamingNews;
import java.time.LocalDateTime;

public record GamingNewsResponse(
        Long id,
        String title,
        String content,
        String gameTag,
        LocalDateTime createdAt,
        LocalDateTime publishedAt
) {

    public static GamingNewsResponse fromEntity(GamingNews entity) {
        LocalDateTime publishedAt = entity.getPublishedAt() != null
                ? entity.getPublishedAt()
                : entity.getCreatedAt();

        return new GamingNewsResponse(
                entity.getId(),
                entity.getTitle(),
                entity.getContent(),
                entity.getGameTag(),
                entity.getCreatedAt(),
                publishedAt
        );
    }
}
