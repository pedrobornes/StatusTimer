"""Harvest upcoming releases from IGDB and map them into the sync contract."""

from __future__ import annotations

import logging
from typing import Any

from clients.igdb_client import IgdbClient, is_igdb_configured
from config.settings import settings
from models.enums import Platform
from config.game_slug_registry import normalize_catalog_slug
from models.normalization import to_slug
from models.schemas import GameReleasePayload, PlatformRelease
from scrapers.igdb_media import (
    IgdbGameMetadata,
    is_main_game,
    parse_igdb_game_metadata,
    resolve_display_name,
    resolve_hero_url,
)
from scrapers.igdb_platforms import has_supported_igdb_platform

logger = logging.getLogger(__name__)

IGDB_PLATFORM_IDS: dict[int, Platform] = {
    6: Platform.PC,
    14: Platform.PC,
    167: Platform.PS5,
    169: Platform.XBOX,
    130: Platform.SWITCH,
}


def fetch_igdb_upcoming_releases() -> list[GameReleasePayload]:
    releases, _, _ = fetch_igdb_upcoming_releases_batch(offset=0)
    return releases


def fetch_igdb_upcoming_releases_batch(
    *,
    offset: int = 0,
    limit: int | None = None,
) -> tuple[list[GameReleasePayload], int, bool]:
    """
    Fetch one IGDB page of upcoming releases.

    Returns (payloads, raw_row_count, catalog_exhausted).
    """
    if not is_igdb_configured():
        logger.info("IGDB credentials missing; upcoming release harvest skipped.")
        return [], 0, True

    resolved_limit = limit or settings.igdb_releases_limit

    client = IgdbClient()
    try:
        raw_games = client.fetch_upcoming_games(limit=resolved_limit, start_offset=offset)
    except Exception:
        logger.exception("IGDB upcoming release harvest failed.")
        return [], 0, False

    releases = _map_raw_games_to_releases(raw_games)
    catalog_exhausted = len(raw_games) < resolved_limit
    logger.info(
        "IGDB harvested %s upcoming release payload(s) from %s raw row(s) at offset %s",
        len(releases),
        len(raw_games),
        offset,
    )
    return releases, len(raw_games), catalog_exhausted


def _map_raw_games_to_releases(raw_games: list[dict[str, Any]]) -> list[GameReleasePayload]:
    releases: list[GameReleasePayload] = []
    for raw_game in raw_games:
        if not is_main_game(raw_game):
            logger.info(
                "Skipping non-main IGDB release (category=%s): %s",
                raw_game.get("category"),
                raw_game.get("name"),
            )
            continue

        if not has_supported_igdb_platform(raw_game.get("platforms")):
            logger.info(
                "Skipping IGDB release without PC/PS5/Xbox platforms: %s",
                raw_game.get("name"),
            )
            continue

        try:
            metadata = parse_igdb_game_metadata(raw_game)
            release = map_igdb_metadata_to_release(metadata, raw_game)
        except ValueError as error:
            logger.warning("Skipping IGDB game row: %s", error)
            continue

        releases.append(release)
        logger.info(
            "IGDB release [%s] %s | hype=%s | platforms=%s",
            release.slug,
            release.game_name,
            release.hype_count,
            len(release.platforms),
        )

    return releases


def map_igdb_metadata_to_release(
    metadata: IgdbGameMetadata,
    raw_game: dict[str, Any],
) -> GameReleasePayload:
    platform_entries = _map_platform_entries(raw_game.get("platforms"), metadata.release_date)

    return GameReleasePayload(
        gameName=resolve_display_name(metadata),
        slug=normalize_catalog_slug(to_slug(metadata.slug or metadata.name)),
        genreNames=_clean_genre_names(metadata.genre_names),
        platforms=platform_entries,
        hypeCount=metadata.hype_count,
        imageUrl=metadata.cover_url,
        logoUrl=resolve_hero_url(metadata),
        igdbGameId=metadata.igdb_game_id,
        userRating=metadata.user_rating,
        criticRating=metadata.critic_rating,
        screenshotUrls=metadata.screenshot_urls,
        trailerVideoIds=metadata.trailer_video_ids,
        steamAppId=metadata.steam_app_id,
    )


def _map_platform_entries(
    raw_platforms: Any,
    release_date,
) -> list[PlatformRelease]:
    platform_ids = raw_platforms if isinstance(raw_platforms, list) else []
    mapped: list[PlatformRelease] = []
    seen: set[Platform] = set()

    for platform_id in platform_ids:
        if not isinstance(platform_id, int):
            continue

        platform = IGDB_PLATFORM_IDS.get(platform_id)
        if platform is None or platform in seen:
            continue

        mapped.append(PlatformRelease(platform=platform, release_date=release_date))
        seen.add(platform)

    if mapped:
        return mapped

    return [PlatformRelease(platform=Platform.PC, release_date=release_date)]


def _clean_genre_names(genre_names: list[str]) -> list[str]:
    """Trim, drop blanks, and de-duplicate IGDB genre names (order-preserving)."""
    seen: set[str] = set()
    cleaned: list[str] = []
    for name in genre_names:
        if not name:
            continue
        trimmed = name.strip()
        if not trimmed or trimmed in seen:
            continue
        seen.add(trimmed)
        cleaned.append(trimmed)
    return cleaned
