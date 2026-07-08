"""Harvest upcoming releases from IGDB and map them into the sync contract."""

from __future__ import annotations

import logging
from typing import Any

from clients.igdb_client import IgdbClient, is_igdb_configured
from models.enums import Platform
from models.normalization import to_slug
from models.schemas import GameReleasePayload, PlatformRelease
from scrapers.igdb_media import IgdbGameMetadata, is_main_game, parse_igdb_game_metadata
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
    if not is_igdb_configured():
        logger.info("IGDB credentials missing; upcoming release harvest skipped.")
        return []

    client = IgdbClient()
    try:
        raw_games = client.fetch_upcoming_games()
    except Exception:
        logger.exception("IGDB upcoming release harvest failed.")
        return []

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

    logger.info("IGDB harvested %s upcoming release payload(s)", len(releases))
    return releases


def map_igdb_metadata_to_release(
    metadata: IgdbGameMetadata,
    raw_game: dict[str, Any],
) -> GameReleasePayload:
    platform_entries = _map_platform_entries(raw_game.get("platforms"), metadata.release_date)

    return GameReleasePayload(
        gameName=metadata.name,
        slug=to_slug(metadata.name),
        genreNames=_clean_genre_names(metadata.genre_names),
        platforms=platform_entries,
        hypeCount=metadata.hype_count,
        imageUrl=metadata.cover_url,
        logoUrl=metadata.background_url or metadata.logo_url,
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
