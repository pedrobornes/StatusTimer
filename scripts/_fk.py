from sqlalchemy import text
from config.database import get_engine

with get_engine().connect() as c:
    print("-- FK constraints referencing games --")
    for r in c.execute(text(
        "SELECT kcu.table_name AS tbl, kcu.column_name AS col, "
        "kcu.constraint_name AS cname, rc.delete_rule AS del "
        "FROM information_schema.referential_constraints rc "
        "JOIN information_schema.key_column_usage kcu "
        "  ON rc.constraint_name = kcu.constraint_name "
        "  AND rc.constraint_schema = kcu.constraint_schema "
        "WHERE rc.referenced_table_name='games' AND rc.constraint_schema=DATABASE()"
    )).mappings():
        print(dict(r))

    print("\n-- overwatch rows --")
    for r in c.execute(text(
        "SELECT id, slug, game_name, igdb_game_id, steam_app_id, scrape_tier, "
        "featured, lifecycle_state FROM games "
        "WHERE slug LIKE '%overwatch%' ORDER BY slug"
    )).mappings():
        print(dict(r))

    print("\n-- child row counts for ids to delete (14,48,62) --")
    for tbl, col in [("game_telemetry","game_id"), ("game_platform_detail","game_id")]:
        try:
            for r in c.execute(text(
                f"SELECT {col} AS gid, COUNT(*) n FROM {tbl} "
                f"WHERE {col} IN (14,48,62) GROUP BY {col}"
            )).mappings():
                print(tbl, dict(r))
        except Exception as e:
            print(tbl, "ERR", e)
