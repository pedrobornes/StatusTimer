"""Harvest upcoming releases from IGDB and map them into the sync contract."""

from __future__ import annotations

import logging
from typing import Any

from clients.igdb_client import IgdbClient, is_igdb_configured
from models.enums import GameGenre, Platform
from models.normalization import normalize_genre, to_slug
from models.schemas import GameReleasePayload, PlatformRelease
from scrapers.igdb_media import IgdbGameMetadata, is_main_game, parse_igdb_game_metadata

logger = logging.getLogger(__name__)

IGDB_PLATFORM_IDS: dict[int, Platform] = {
    6: Platform.PC,
    14: Platform.PC,
    167: Platform.PS5,
    169: Platform.XBOX,
    130: Platform.SWITCH,
}

IGDB_GENRE_NAME_MAP: dict[str, GameGenre] = {
    "shooter": GameGenre.SHOOTER,
    "fps": GameGenre.SHOOTER,
    "tactical shooter": GameGenre.SHOOTER,
    "role-playing (rpg)": GameGenre.RPG,
    "rpg": GameGenre.RPG,
    "survival": GameGenre.SURVIVAL,
    "sport": GameGenre.SPORTS_RACING,
    "racing": GameGenre.SPORTS_RACING,
    "strategy": GameGenre.STRATEGY,
    "real-time strategy (rts)": GameGenre.STRATEGY,
    "adventure": GameGenre.ACTION,
    "action": GameGenre.ACTION,
    "fighting": GameGenre.ACTION,
    "platform": GameGenre.ACTION,
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
    genre = _resolve_genre(metadata.genre_names)

    return GameReleasePayload(
        gameName=metadata.name,
        slug=to_slug(metadata.name),
        genre=genre,
        platforms=platform_entries,
        hypeCount=metadata.hype_count,
        imageUrl=metadata.cover_url,
        logoUrl=metadata.background_url or metadata.logo_url,
        igdbGameId=metadata.igdb_game_id,
        userRating=metadata.user_rating,
        criticRating=metadata.critic_rating,
        screenshotUrls=metadata.screenshot_urls,
        trailerVideoIds=metadata.trailer_video_ids,
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


def _resolve_genre(genre_names: list[str]) -> GameGenre:
    for genre_name in genre_names:
        normalized = genre_name.strip().casefold()
        if normalized in IGDB_GENRE_NAME_MAP:
            return IGDB_GENRE_NAME_MAP[normalized]

    return normalize_genre(genre_names)
