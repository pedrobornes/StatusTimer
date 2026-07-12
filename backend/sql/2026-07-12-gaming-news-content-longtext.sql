-- Patch notes from Steam/Riot CMS can exceed MySQL TEXT (64 KB).
-- Apply once on production MySQL before or after deploying the backend entity change.

ALTER TABLE gaming_news
    MODIFY COLUMN content LONGTEXT NOT NULL;
