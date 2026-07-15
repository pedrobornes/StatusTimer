-- Steam review popularity signals for catalog sorting.
-- Apply before prod deploy with ddl-auto=validate.

ALTER TABLE games
    ADD COLUMN steam_review_count INT NULL,
    ADD COLUMN steam_review_score_percent INT NULL;
