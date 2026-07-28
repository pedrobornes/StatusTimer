-- Durable redirects for retired duplicate news slugs (e.g. foo-2 → foo).
-- Apply once on production MySQL before deploying backend with ddl-auto=validate.

CREATE TABLE IF NOT EXISTS gaming_news_slug_aliases (
    id BIGINT NOT NULL AUTO_INCREMENT,
    alias_slug VARCHAR(255) NOT NULL,
    news_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_gaming_news_slug_aliases_alias_slug (alias_slug),
    KEY idx_gaming_news_slug_aliases_news_id (news_id),
    CONSTRAINT fk_gaming_news_slug_aliases_news
        FOREIGN KEY (news_id) REFERENCES gaming_news (id)
        ON DELETE CASCADE
);
