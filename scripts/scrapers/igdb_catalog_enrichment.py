"""Enrich catalog entries with IGDB artwork and metadata."""

from __future__ import annotations

import logging

from clients.igdb_client import IgdbClient, is_igdb_configured
from config.settings import settings
from models.catalog_schemas import GameCatalogEntryPayload
from scrapers.platform_images import sanitize_igdb_image_url

logger = logging.getLogger(__name__)


def enrich_catalog_entries_with_igdb(
    entries: list[GameCatalogEntryPayload],
) -> list[GameCatalogEntryPayload]:
    if not is_igdb_configured() or not entries:
        return entries

    client = IgdbClient()
    enrich_limit = max(settings.igdb_catalog_enrich_limit, 0)
    enriched: list[GameCatalogEntryPayload] = []

    for index, entry in enumerate(entries):
        if index >= enrich_limit:
            enriched.append(entry)
            continue

        metadata = client.lookup_game_metadata(entry.game_name)
        if metadata is None:
            enriched.append(entry)
            continue

        enriched.append(
            entry.model_copy(
                update={
                    "logo_url": sanitize_igdb_image_url(metadata.logo_url)
                    or sanitize_igdb_image_url(entry.logo_url),
                    "cover_url": sanitize_igdb_image_url(metadata.cover_url)
                    or sanitize_igdb_image_url(entry.cover_url),
                    "steam_app_id": metadata.steam_app_id or entry.steam_app_id,
                    "igdb_game_id": metadata.igdb_game_id,
                    "genre_name": metadata.genre_names[0] if metadata.genre_names else None,
                    "user_rating": metadata.user_rating,
                    "critic_rating": metadata.critic_rating,
                    "themes": metadata.themes,
                    "screenshot_urls": metadata.screenshot_urls,
                    "trailer_video_ids": metadata.trailer_video_ids,
                }
            )
        )
        logger.info("IGDB enriched catalog entry for %s", entry.slug)

    return enriched
