"""Release harvester skeleton (Task 1) with external CDN image URLs (Task 3)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from models.normalization import normalize_genre, normalize_platform, to_slug
from models.schemas import GameReleasePayload, PlatformRelease
from scrapers.platform_images import (
    ROCKSTAR_GTA_VI_KEY_ART,
    resolve_release_image_url,
)


@dataclass(frozen=True)
class RawReleaseSource:
    """Intermediate harvest row before normalization into the sync contract."""

    game_name: str
    raw_genre_tags: list[str]
    raw_platform_dates: dict[str, date | None]
    steam_app_id: int | None = None
    direct_image_url: str | None = None


RAW_UPCOMING_RELEASES: tuple[RawReleaseSource, ...] = (
    RawReleaseSource(
        game_name="GTA VI",
        raw_genre_tags=["action", "open world"],
        raw_platform_dates={
            "PS5": date(2026, 11, 19),
            "Xbox Series X": date(2026, 11, 19),
            "PC": None,
        },
        direct_image_url=ROCKSTAR_GTA_VI_KEY_ART,
    ),
    RawReleaseSource(
        game_name="Hollow Knight: Silksong",
        raw_genre_tags=["metroidvania", "action adventure"],
        raw_platform_dates={
            "PC": date(2025, 9, 4),
            "Nintendo Switch": date(2025, 9, 4),
            "PlayStation 5": date(2025, 9, 4),
            "Xbox Series S": date(2025, 9, 4),
        },
        steam_app_id=1030300,
    ),
)


def build_release_payload(
    game_name: str,
    raw_genre_tags: list[str],
    raw_platform_dates: dict[str, date | None],
    *,
    steam_app_id: int | None = None,
    direct_image_url: str | None = None,
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

    image_url = resolve_release_image_url(
        steam_app_id=steam_app_id,
        direct_url=direct_image_url,
    )

    return GameReleasePayload(
        gameName=game_name,
        slug=to_slug(game_name),
        genre=normalize_genre(raw_genre_tags),
        platforms=platforms,
        imageUrl=image_url,
    )


def fetch_upcoming_releases() -> list[GameReleasePayload]:
    """
    Placeholder harvester for external APIs (IGDB, Steam, Allkeyshop-style feeds).

    Cover art is resolved from platform CDNs only. No local static assets are used.
    """
    releases: list[GameReleasePayload] = []

    for source in RAW_UPCOMING_RELEASES:
        releases.append(
            build_release_payload(
                game_name=source.game_name,
                raw_genre_tags=source.raw_genre_tags,
                raw_platform_dates=source.raw_platform_dates,
                steam_app_id=source.steam_app_id,
                direct_image_url=source.direct_image_url,
            ),
        )

    return releases
