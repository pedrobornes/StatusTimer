"""Release harvester skeleton (Task 1)."""

from datetime import date

from models.normalization import normalize_genre, normalize_platform, to_slug
from models.schemas import GameReleasePayload, PlatformRelease


def build_release_payload(
    game_name: str,
    raw_genre_tags: list[str],
    raw_platform_dates: dict[str, date | None],
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

    return GameReleasePayload(
        gameName=game_name,
        slug=to_slug(game_name),
        genre=normalize_genre(raw_genre_tags),
        platforms=platforms,
    )


def fetch_upcoming_releases() -> list[GameReleasePayload]:
    """
    Placeholder harvester for external APIs (IGDB, Steam, Allkeyshop-style feeds).

    Replace this stub with real HTTP calls in the next implementation pass.
    """
    return [
        build_release_payload(
            game_name="GTA VI",
            raw_genre_tags=["action", "open world"],
            raw_platform_dates={
                "PS5": date(2026, 11, 19),
                "Xbox Series X": date(2026, 11, 19),
                "PC": None,
            },
        ),
        build_release_payload(
            game_name="Hollow Knight: Silksong",
            raw_genre_tags=["metroidvania", "action adventure"],
            raw_platform_dates={
                "PC": date(2025, 9, 4),
                "Nintendo Switch": date(2025, 9, 4),
                "PlayStation 5": date(2025, 9, 4),
                "Xbox Series S": date(2025, 9, 4),
            },
        ),
    ]
