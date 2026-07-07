"""IGDB popular-right-now catalog source for tracked games."""

from __future__ import annotations

import logging

from clients.igdb_client import IgdbClient, is_igdb_configured
from config.settings import settings
from models.catalog_schemas import GameCatalogEntryPayload
from models.normalization import to_slug
from scrapers.igdb_media import parse_igdb_game_metadata, resolve_catalog_image_urls

logger = logging.getLogger(__name__)


def fetch_igdb_popular_catalog(limit: int | None = None) -> list[GameCatalogEntryPayload]:
    """Build catalog payloads from IGDB popular released titles."""
    if not is_igdb_configured():
        logger.warning("IGDB credentials not configured; skipping popular catalog source.")
        return []

    max_entries = limit or settings.twitch_top_n
    if max_entries <= 0:
        return []

    client = IgdbClient()
    rows = client.fetch_popular_right_now_games(limit=max_entries)
    payloads: list[GameCatalogEntryPayload] = []
    seen_slugs: set[str] = set()

    for row in rows:
        try:
            metadata = parse_igdb_game_metadata(row)
        except ValueError:
            continue

        slug = to_slug(metadata.slug or metadata.name)
        if not slug or slug in seen_slugs:
            continue

        seen_slugs.add(slug)
        hero_url, cover_url = resolve_catalog_image_urls(metadata)
        payloads.append(
            GameCatalogEntryPayload(
                slug=slug,
                game_name=metadata.name,
                steam_app_id=metadata.steam_app_id,
                logo_url=hero_url,
                cover_url=cover_url,
                featured=False,
                igdb_game_id=metadata.igdb_game_id,
                genre_name=metadata.genre_names[0] if metadata.genre_names else None,
                user_rating=metadata.user_rating,
                critic_rating=metadata.critic_rating,
                screenshot_urls=metadata.screenshot_urls,
                trailer_video_ids=metadata.trailer_video_ids,
            )
        )

    logger.info("Prepared %s IGDB popular catalog entries", len(payloads))
    return payloads
