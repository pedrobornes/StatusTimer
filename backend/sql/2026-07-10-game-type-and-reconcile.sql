-- StatusTimer prod migration: game_type column + safe defaults
-- Apply after 2026-07-07-hard-cutover-v2.sql and before SPRING_PROFILES_ACTIVE=prod with ddl-auto=validate

SET @game_type_exists := (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'games'
      AND column_name = 'game_type'
);

SET @add_game_type_sql := IF(
    @game_type_exists = 0,
    'ALTER TABLE games ADD COLUMN game_type VARCHAR(32) NOT NULL DEFAULT ''MULTIPLAYER''',
    'SELECT ''games.game_type already exists'' AS migration_info'
);

PREPARE add_game_type_stmt FROM @add_game_type_sql;
EXECUTE add_game_type_stmt;
DEALLOCATE PREPARE add_game_type_stmt;

-- Normalize null/blank values if column existed without NOT NULL enforcement
UPDATE games
SET game_type = 'MULTIPLAYER'
WHERE game_type IS NULL OR TRIM(game_type) = '';
