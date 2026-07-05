package com.statustimer.dto.request;

import com.statustimer.entity.GamingNews;
import java.time.LocalDateTime;

public record CreateGamingNewsRequest(
        String title,
        String content,
        String gameTag,
        LocalDateTime publishedAt
) {

    public GamingNews toEntity(LocalDateTime ingestedAt) {
        LocalDateTime resolvedPublishedAt = publishedAt != null ? publishedAt : ingestedAt;

        return GamingNews.builder()
                .title(title)
                .content(content)
                .gameTag(gameTag)
                .createdAt(ingestedAt)
                .publishedAt(resolvedPublishedAt)
                .build();
    }
}
