package com.statustimer.dto.request;

import com.statustimer.entity.GamingNews;
import java.time.LocalDateTime;

public record CreateGamingNewsRequest(
        String title,
        String content,
        String gameTag
) {

    public GamingNews toEntity(LocalDateTime createdAt) {
        return GamingNews.builder()
                .title(title)
                .content(content)
                .gameTag(gameTag)
                .createdAt(createdAt)
                .build();
    }
}
