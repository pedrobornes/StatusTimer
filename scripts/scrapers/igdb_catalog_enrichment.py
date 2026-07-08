"""Enrich catalog entries with IGDB artwork and metadata."""

from __future__ import annotations

import logging

from clients.igdb_client import IgdbClient, is_igdb_configured
from config.game_slug_registry import canonical_catalog_slug, get_pinned_game
from config.settings import settings
from models.catalog_schemas import GameCatalogEntryPayload
from scrapers.igdb_media import resolve_catalog_image_urls
from scrapers.platform_images import sanitize_igdb_image_url

logger = logging.getLogger(__name__)


def _is_blocked_igdb_metadata(slug: str, metadata) -> bool:
    pin = get_pinned_game(slug)
    if pin is None:
        return False

    if metadata.slug in pin["blocked_igdb_slugs"]:
        return True

    if metadata.steam_app_id in pin["blocked_steam_app_ids"]:
        return True

    return metadata.igdb_game_id != pin["igdb_game_id"]


def enrich_catalog_entries_with_igdb(
    entries: list[GameCatalogEntryPayload],
) -> list[GameCatalogEntryPayload]:
    if not is_igdb_configured() or not entries:
        return entries

    client = IgdbClient()
    enrich_limit = max(settings.igdb_catalog_enrich_limit, 0)
    enriched: list[GameCatalogEntryPayload] = []

    for index, entry in enumerate(entries):
        canonical_slug = canonical_catalog_slug(entry.slug)
        working_entry = (
            entry
            if canonical_slug == entry.slug
            else entry.model_copy(update={"slug": canonical_slug})
        )

        if index >= enrich_limit:
            enriched.append(working_entry)
            continue

        pin = get_pinned_game(canonical_slug)
        metadata = None
        if pin is not None:
            metadata = client.lookup_game_metadata_by_slug(pin["igdb_slug"])
            if metadata is not None and _is_blocked_igdb_metadata(canonical_slug, metadata):
                metadata = None
        else:
            metadata = client.lookup_game_metadata(working_entry.game_name)

        if metadata is None:
            if pin is not None:
                enriched.append(
                    working_entry.model_copy(
                        update={
                            "logo_url": pin["fallback_logo_url"],
                            "cover_url": pin["fallback_cover_url"],
                            "steam_app_id": pin["steam_app_id"],
                            "igdb_game_id": pin["igdb_game_id"],
                        }
                    )
                )
                logger.info("Pinned fallback assets applied for %s", canonical_slug)
            else:
                enriched.append(working_entry)
            continue

        hero_url, cover_url = resolve_catalog_image_urls(metadata)
        steam_app_id = pin["steam_app_id"] if pin is not None else metadata.steam_app_id
        igdb_game_id = pin["igdb_game_id"] if pin is not None else metadata.igdb_game_id

        enriched.append(
            working_entry.model_copy(
                update={
                    "logo_url": sanitize_igdb_image_url(hero_url)
                    or sanitize_igdb_image_url(working_entry.logo_url),
                    "cover_url": sanitize_igdb_image_url(cover_url)
                    or sanitize_igdb_image_url(working_entry.cover_url),
                    "steam_app_id": steam_app_id or working_entry.steam_app_id,
                    "igdb_game_id": igdb_game_id,
                    "genre_name": metadata.genre_names[0] if metadata.genre_names else None,
                    "user_rating": metadata.user_rating,
                    "critic_rating": metadata.critic_rating,
                    "screenshot_urls": metadata.screenshot_urls,
                    "trailer_video_ids": metadata.trailer_video_ids,
                    "youtube_channel_url": metadata.youtube_channel_url,
                    "external_links": metadata.external_links,
                }
            )
        )
        logger.info("IGDB enriched catalog entry for %s", canonical_slug)

    return enriched
