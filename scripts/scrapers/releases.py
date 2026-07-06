"""Release harvester backed by IGDB discovery."""

from __future__ import annotations

import logging
from datetime import date

from models.normalization import normalize_genre, normalize_platform, to_slug
from models.schemas import GameReleasePayload, PlatformRelease
from scrapers.igdb_releases import fetch_igdb_upcoming_releases
from scrapers.platform_images import resolve_release_image_url, resolve_release_logo_url

logger = logging.getLogger(__name__)


def build_release_payload(
    game_name: str,
    raw_genre_tags: list[str],
    raw_platform_dates: dict[str, date | None],
    *,
    steam_app_id: int | None = None,
    direct_image_url: str | None = None,
    hype_count: int = 0,
) -> GameReleasePayload:
    """Map raw source rows into the normalized ingestion contract."""
    platforms: list[PlatformRelease] = []

    for raw_platform, release_date in raw_platform_dates.items():
        platform = normalize_platform(raw_platform)
        if platform is None:
            continue
        platforms.append(
            PlatformRelease(platform=platform, release_date=release_date),
        )

    if not platforms:
        raise ValueError(
            f"No supported platforms mapped for '{game_name}'. "
            "Expected one of: PC, PS5, XBOX, SWITCH, SWITCH_2.",
        )

    image_url = resolve_release_image_url(direct_url=direct_image_url)
    logo_url = resolve_release_logo_url(direct_url=direct_image_url)

    return GameReleasePayload(
        gameName=game_name,
        slug=to_slug(game_name),
        genre=normalize_genre(raw_genre_tags),
        platforms=platforms,
        hypeCount=hype_count,
        imageUrl=image_url,
        logoUrl=logo_url,
    )


def fetch_upcoming_releases() -> list[GameReleasePayload]:
    """Harvest upcoming releases from IGDB (requires Twitch/IGDB API credentials)."""
    return fetch_igdb_upcoming_releases()
