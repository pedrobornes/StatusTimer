"""Refresh unsuitable logo_url values from IGDB artwork heroes."""

from __future__ import annotations

import pymysql

from clients.igdb_client import IgdbClient
from config.settings import settings
from scrapers.igdb_media import is_suitable_hero_url, resolve_catalog_image_urls


def main() -> None:
    client = IgdbClient()
    conn = pymysql.connect(
        host=settings.mysql_host,
        port=settings.mysql_port,
        user=settings.mysql_user,
        password=settings.mysql_password,
        database=settings.mysql_database,
    )
    cur = conn.cursor()
    cur.execute("SELECT slug, logo_url, igdb_game_id FROM games")
    rows = cur.fetchall()

    updated = 0
    skipped = 0

    for slug, logo_url, igdb_game_id in rows:
        metadata = None
        if isinstance(igdb_game_id, int) and igdb_game_id > 0:
            metadata = client.lookup_game_metadata_by_id(igdb_game_id)
        if metadata is None:
            metadata = client.lookup_game_metadata_by_slug(slug)
        if metadata is None:
            skipped += 1
            continue

        hero, _ = resolve_catalog_image_urls(metadata)
        if not is_suitable_hero_url(hero):
            skipped += 1
            continue

        if hero == logo_url:
            continue

        cur.execute("UPDATE games SET logo_url = %s WHERE slug = %s", (hero, slug))
        updated += 1
        print(f"updated {slug} -> {hero}")

    conn.commit()
    conn.close()
    print(f"done: updated={updated} skipped={skipped}")


if __name__ == "__main__":
    main()
