from __future__ import annotations

import pymysql


def main() -> None:
    conn = pymysql.connect(
        host="127.0.0.1",
        port=3307,
        user="root",
        password="root",
        database="statustimer",
        autocommit=False,
    )
    cur = conn.cursor()

    def has_table(table: str) -> bool:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = %s
            """,
            (table,),
        )
        return cur.fetchone()[0] > 0

    def has_column(table: str, column: str) -> bool:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = %s
              AND column_name = %s
            """,
            (table, column),
        )
        return cur.fetchone()[0] > 0

    def has_index(table: str, index_name: str) -> bool:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.statistics
            WHERE table_schema = DATABASE()
              AND table_name = %s
              AND index_name = %s
            """,
            (table, index_name),
        )
        return cur.fetchone()[0] > 0

    def has_fk(table: str, fk_name: str) -> bool:
        cur.execute(
            """
            SELECT COUNT(*)
            FROM information_schema.referential_constraints
            WHERE constraint_schema = DATABASE()
              AND table_name = %s
              AND constraint_name = %s
            """,
            (table, fk_name),
        )
        return cur.fetchone()[0] > 0

    # games cleanup
    if has_column("games", "themes_json"):
        cur.execute("ALTER TABLE games DROP COLUMN themes_json")
    if not has_index("games", "idx_games_steam_app_id"):
        cur.execute("ALTER TABLE games ADD INDEX idx_games_steam_app_id (steam_app_id)")

    # game_telemetry -> game_id
    if has_column("game_telemetry", "game_slug") and not has_column("game_telemetry", "game_id"):
        cur.execute("ALTER TABLE game_telemetry ADD COLUMN game_id BIGINT NULL")
    if has_column("game_telemetry", "game_slug"):
        cur.execute(
            """
            UPDATE game_telemetry gt
            JOIN games g ON g.slug = gt.game_slug
            SET gt.game_id = g.id
            WHERE gt.game_id IS NULL
            """
        )
        cur.execute("ALTER TABLE game_telemetry MODIFY COLUMN game_id BIGINT NOT NULL")
        if not has_fk("game_telemetry", "fk_game_telemetry_game"):
            cur.execute(
                """
                ALTER TABLE game_telemetry
                ADD CONSTRAINT fk_game_telemetry_game
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
                """
            )
        if not has_index("game_telemetry", "uk_game_telemetry_game_id"):
            cur.execute("ALTER TABLE game_telemetry ADD UNIQUE KEY uk_game_telemetry_game_id (game_id)")
        cur.execute("ALTER TABLE game_telemetry DROP COLUMN game_slug")

    # game_telemetry_history -> game_id
    if has_column("game_telemetry_history", "game_slug") and not has_column("game_telemetry_history", "game_id"):
        cur.execute("ALTER TABLE game_telemetry_history ADD COLUMN game_id BIGINT NULL")
    if has_column("game_telemetry_history", "game_slug"):
        cur.execute(
            """
            UPDATE game_telemetry_history h
            JOIN games g ON g.slug = h.game_slug
            SET h.game_id = g.id
            WHERE h.game_id IS NULL
            """
        )
        cur.execute("ALTER TABLE game_telemetry_history MODIFY COLUMN game_id BIGINT NOT NULL")
        if not has_fk("game_telemetry_history", "fk_game_telemetry_history_game"):
            cur.execute(
                """
                ALTER TABLE game_telemetry_history
                ADD CONSTRAINT fk_game_telemetry_history_game
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
                """
            )
        if has_index("game_telemetry_history", "idx_telemetry_history_slug_checked"):
            cur.execute("ALTER TABLE game_telemetry_history DROP INDEX idx_telemetry_history_slug_checked")
        if not has_index("game_telemetry_history", "idx_telemetry_history_game_checked"):
            cur.execute(
                """
                ALTER TABLE game_telemetry_history
                ADD INDEX idx_telemetry_history_game_checked (game_id, checked_at)
                """
            )
        cur.execute("ALTER TABLE game_telemetry_history DROP COLUMN game_slug")

    # telemetry_daily_rollup -> game_id
    if has_column("telemetry_daily_rollup", "game_slug") and not has_column("telemetry_daily_rollup", "game_id"):
        cur.execute("ALTER TABLE telemetry_daily_rollup ADD COLUMN game_id BIGINT NULL")
    if has_column("telemetry_daily_rollup", "game_slug"):
        cur.execute(
            """
            UPDATE telemetry_daily_rollup r
            JOIN games g ON g.slug = r.game_slug
            SET r.game_id = g.id
            WHERE r.game_id IS NULL
            """
        )
        cur.execute("ALTER TABLE telemetry_daily_rollup MODIFY COLUMN game_id BIGINT NOT NULL")
        if not has_fk("telemetry_daily_rollup", "fk_telemetry_rollup_game"):
            cur.execute(
                """
                ALTER TABLE telemetry_daily_rollup
                ADD CONSTRAINT fk_telemetry_rollup_game
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
                """
            )
        if has_index("telemetry_daily_rollup", "idx_telemetry_rollup_slug_date"):
            cur.execute("ALTER TABLE telemetry_daily_rollup DROP INDEX idx_telemetry_rollup_slug_date")
        if has_index("telemetry_daily_rollup", "uk_telemetry_rollup_slug_date"):
            cur.execute("ALTER TABLE telemetry_daily_rollup DROP INDEX uk_telemetry_rollup_slug_date")
        if not has_index("telemetry_daily_rollup", "idx_telemetry_rollup_game_date"):
            cur.execute(
                """
                ALTER TABLE telemetry_daily_rollup
                ADD INDEX idx_telemetry_rollup_game_date (game_id, rollup_date)
                """
            )
        if not has_index("telemetry_daily_rollup", "uk_telemetry_rollup_game_date"):
            cur.execute(
                """
                ALTER TABLE telemetry_daily_rollup
                ADD CONSTRAINT uk_telemetry_rollup_game_date UNIQUE (game_id, rollup_date)
                """
            )
        cur.execute("ALTER TABLE telemetry_daily_rollup DROP COLUMN game_slug")

    # gaming_news: nullable game_id + drop game_tag
    if has_column("gaming_news", "game_tag"):
        cur.execute(
            """
            UPDATE gaming_news n
            JOIN games g ON g.slug = n.game_tag
            SET n.game_id = g.id
            WHERE n.game_id IS NULL
              AND n.game_tag IS NOT NULL
              AND n.game_tag <> ''
            """
        )
        if not has_index("gaming_news", "idx_gaming_news_game_id"):
            cur.execute("ALTER TABLE gaming_news ADD INDEX idx_gaming_news_game_id (game_id)")
        cur.execute("ALTER TABLE gaming_news DROP COLUMN game_tag")

    # incident_log optional index
    if has_table("incident_log") and not has_index("incident_log", "idx_incident_crisis"):
        cur.execute("ALTER TABLE incident_log ADD INDEX idx_incident_crisis (is_up, category)")

    if has_table("tracked_games"):
        cur.execute("DROP TABLE tracked_games")

    conn.commit()
    cur.close()
    conn.close()
    print("Hard cutover applied successfully.")


if __name__ == "__main__":
    main()
