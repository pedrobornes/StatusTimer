-- StatusTimer DB hard cutover to schema v2
-- Target: MySQL 8.x (non-production destructive migration allowed)

-- 1) Games table cleanup and final shape
-- Note: game_name and idx_games_steam_app_id already exist in current schema.
ALTER TABLE games
    DROP COLUMN themes_json;

-- 2) Satellite tables: migrate slug/tag joins to numeric FK game_id
ALTER TABLE game_telemetry
    ADD COLUMN game_id BIGINT NULL;

UPDATE game_telemetry gt
JOIN games g ON g.slug = gt.game_slug
SET gt.game_id = g.id
WHERE gt.game_id IS NULL;

ALTER TABLE game_telemetry
    MODIFY COLUMN game_id BIGINT NOT NULL,
    ADD CONSTRAINT fk_game_telemetry_game
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    ADD UNIQUE KEY uk_game_telemetry_game_id (game_id),
    DROP COLUMN game_slug;

ALTER TABLE game_telemetry_history
    ADD COLUMN game_id BIGINT NULL;

UPDATE game_telemetry_history gth
JOIN games g ON g.slug = gth.game_slug
SET gth.game_id = g.id
WHERE gth.game_id IS NULL;

ALTER TABLE game_telemetry_history
    MODIFY COLUMN game_id BIGINT NOT NULL,
    ADD CONSTRAINT fk_game_telemetry_history_game
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    ADD INDEX idx_telemetry_history_game_checked (game_id, checked_at),
    DROP INDEX idx_telemetry_history_slug_checked,
    DROP COLUMN game_slug;

ALTER TABLE telemetry_daily_rollup
    ADD COLUMN game_id BIGINT NULL;

UPDATE telemetry_daily_rollup tdr
JOIN games g ON g.slug = tdr.game_slug
SET tdr.game_id = g.id
WHERE tdr.game_id IS NULL;

ALTER TABLE telemetry_daily_rollup
    MODIFY COLUMN game_id BIGINT NOT NULL,
    ADD CONSTRAINT fk_telemetry_rollup_game
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    ADD INDEX idx_telemetry_rollup_game_date (game_id, rollup_date),
    DROP INDEX idx_telemetry_rollup_slug_date,
    DROP INDEX uk_telemetry_rollup_slug_date,
    ADD CONSTRAINT uk_telemetry_rollup_game_date UNIQUE (game_id, rollup_date),
    DROP COLUMN game_slug;

-- gaming_news: keep optional relationship for general news
UPDATE gaming_news gn
JOIN games g ON g.slug = gn.game_tag
SET gn.game_id = g.id
WHERE gn.game_id IS NULL
  AND gn.game_tag IS NOT NULL
  AND gn.game_tag <> '';

ALTER TABLE gaming_news
    ADD INDEX idx_gaming_news_game_id (game_id),
    DROP COLUMN game_tag;

-- 3) Optional incident_log optimization (only if table exists)
SET @incident_exists := (
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = 'incident_log'
);

SET @incident_sql := IF(
    @incident_exists > 0,
    'ALTER TABLE incident_log ADD INDEX idx_incident_crisis (is_up, category)',
    'SELECT "incident_log not present - skipped"'
);
PREPARE stmt_incident FROM @incident_sql;
EXECUTE stmt_incident;
DEALLOCATE PREPARE stmt_incident;

-- 4) Drop legacy table after all backfills are complete
DROP TABLE tracked_games;
