from sqlalchemy import text
from config.database import get_engine

CHILD = ["game_platform_details", "game_telemetry", "game_telemetry_history",
         "gaming_news", "telemetry_daily_rollup"]

with get_engine().connect() as c:
    dbd = c.execute(text(
        "SELECT id, slug, igdb_game_id, steam_app_id, genre_names_json "
        "FROM games WHERE slug='dead-by-daylight'"
    )).mappings().first()
    print("DBD row:", dict(dbd) if dbd else None)

    ids = [14, 48, 62, 84, 5, 54]
    if dbd:
        ids.append(dbd["id"])
    print("\n-- child row counts per game_id --")
    for tbl in CHILD:
        counts = {}
        for r in c.execute(text(
            f"SELECT game_id AS gid, COUNT(*) n FROM {tbl} "
            f"WHERE game_id IN :ids GROUP BY game_id"
        ).bindparams(__import__("sqlalchemy").bindparam("ids", expanding=True)),
                {"ids": ids}).mappings():
            counts[r["gid"]] = r["n"]
        print(f"{tbl:26}", counts)
