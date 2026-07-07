package com.statustimer.dto.request;

import com.statustimer.entity.Game;
import com.statustimer.entity.GamingNews;
import java.time.LocalDateTime;

public record CreateGamingNewsRequest(
        String title,
        String content,
        String gameTag,
        LocalDateTime publishedAt
) {

    public GamingNews toEntity(LocalDateTime ingestedAt, String newsSlug, Game game) {
        LocalDateTime resolvedPublishedAt = publishedAt != null ? publishedAt : ingestedAt;

        return GamingNews.builder()
                .title(title)
                .newsSlug(newsSlug)
                .content(content)
                .game(game)
                .gameTag(gameTag)
                .createdAt(ingestedAt)
                .publishedAt(resolvedPublishedAt)
                .build();
    }
}
