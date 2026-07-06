"""IGDB image URL builders and metadata extraction."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

IGDB_IMAGE_BASE = "https://images.igdb.com/igdb/image/upload"
STEAM_EXTERNAL_CATEGORY = 1
MAIN_GAME_CATEGORY = 0

IGDB_GAME_FIELDS = (
    "id, name, slug, category, first_release_date, platforms, genres.name, themes.name, "
    "cover.image_id, artworks.image_id, screenshots.image_id, "
    "hypes, rating, aggregated_rating, "
    "videos.video_id, external_games.uid, external_games.category"
)


@dataclass(frozen=True)
class IgdbGameMetadata:
    igdb_game_id: int | None
    name: str
    slug: str
    logo_url: str | None
    cover_url: str | None
    user_rating: int | None
    critic_rating: int | None
    themes: list[str] = field(default_factory=list)
    genre_names: list[str] = field(default_factory=list)
    screenshot_urls: list[str] = field(default_factory=list)
    trailer_video_ids: list[str] = field(default_factory=list)
    hype_count: int = 0
    steam_app_id: int | None = None
    release_date: date | None = None


def igdb_image_url(image_id: str, size: str = "t_cover_big") -> str:
    normalized = image_id.strip()
    return f"{IGDB_IMAGE_BASE}/{size}/{normalized}.jpg"


def is_main_game(raw_game: dict[str, Any]) -> bool:
    category = raw_game.get("category")
    if category is None:
        return True
    if isinstance(category, int):
        return category == MAIN_GAME_CATEGORY
    return False


def parse_igdb_game_metadata(raw_game: dict[str, Any]) -> IgdbGameMetadata:
    if not is_main_game(raw_game):
        raise ValueError("IGDB row is not a main_game (category != 0)")

    game_name = str(raw_game.get("name") or "").strip()
    if not game_name:
        raise ValueError("IGDB game is missing name")

    igdb_game_id = raw_game.get("id")
    parsed_id = igdb_game_id if isinstance(igdb_game_id, int) else None

    cover_url = _resolve_cover_url(raw_game.get("cover"))
    logo_url = _resolve_logo_url(raw_game.get("artworks"), raw_game.get("cover"))

    return IgdbGameMetadata(
        igdb_game_id=parsed_id,
        name=game_name,
        slug=str(raw_game.get("slug") or "").strip(),
        logo_url=logo_url,
        cover_url=cover_url,
        user_rating=_normalize_rating(raw_game.get("rating")),
        critic_rating=_normalize_rating(raw_game.get("aggregated_rating")),
        themes=_resolve_theme_names(raw_game.get("themes")),
        genre_names=_resolve_genre_names(raw_game.get("genres")),
        screenshot_urls=_resolve_screenshot_urls(raw_game.get("screenshots")),
        trailer_video_ids=_resolve_trailer_ids(raw_game.get("videos")),
        hype_count=_resolve_hype_count(raw_game.get("hypes")),
        steam_app_id=_resolve_steam_app_id(raw_game.get("external_games")),
        release_date=_parse_release_date(raw_game.get("first_release_date")),
    )


def _resolve_cover_url(raw_cover: Any) -> str | None:
    image_id = _extract_image_id(raw_cover)
    if image_id is None:
        return None
    return igdb_image_url(image_id, "t_cover_big")


def _resolve_logo_url(raw_artworks: Any, raw_cover: Any) -> str | None:
    artworks = raw_artworks if isinstance(raw_artworks, list) else []
    for artwork in artworks:
        image_id = _extract_image_id(artwork)
        if image_id is not None:
            return igdb_image_url(image_id, "t_thumb")

    cover_id = _extract_image_id(raw_cover)
    if cover_id is not None:
        return igdb_image_url(cover_id, "t_cover_small")

    return None


def _resolve_screenshot_urls(raw_screenshots: Any) -> list[str]:
    screenshots = raw_screenshots if isinstance(raw_screenshots, list) else []
    urls: list[str] = []

    for screenshot in screenshots:
        image_id = _extract_image_id(screenshot)
        if image_id is None:
            continue
        urls.append(igdb_image_url(image_id, "t_screenshot_huge"))

    return urls


def _resolve_trailer_ids(raw_videos: Any) -> list[str]:
    videos = raw_videos if isinstance(raw_videos, list) else []
    trailer_ids: list[str] = []

    for video in videos:
        if not isinstance(video, dict):
            continue
        video_id = video.get("video_id")
        if isinstance(video_id, str) and video_id.strip():
            trailer_ids.append(video_id.strip())

    return trailer_ids


def _resolve_theme_names(raw_themes: Any) -> list[str]:
    return _resolve_expanded_names(raw_themes)


def _resolve_genre_names(raw_genres: Any) -> list[str]:
    return _resolve_expanded_names(raw_genres)


def _resolve_expanded_names(raw_values: Any) -> list[str]:
    values = raw_values if isinstance(raw_values, list) else []
    names: list[str] = []

    for value in values:
        if isinstance(value, dict):
            name = value.get("name")
            if isinstance(name, str) and name.strip():
                names.append(name.strip())
            continue

        if isinstance(value, str) and value.strip():
            names.append(value.strip())

    return names


def _extract_image_id(raw_value: Any) -> str | None:
    if isinstance(raw_value, dict):
        image_id = raw_value.get("image_id")
        if isinstance(image_id, str) and image_id.strip():
            return image_id.strip()
    return None


def _resolve_steam_app_id(raw_external_games: Any) -> int | None:
    entries = raw_external_games if isinstance(raw_external_games, list) else []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        if entry.get("category") != STEAM_EXTERNAL_CATEGORY:
            continue

        uid = entry.get("uid")
        if isinstance(uid, str) and uid.isdigit():
            return int(uid)
        if isinstance(uid, int) and uid > 0:
            return uid

    return None


def _resolve_hype_count(raw_hype: Any) -> int:
    if isinstance(raw_hype, int) and raw_hype >= 0:
        return raw_hype
    return 0


def _normalize_rating(raw_value: Any) -> int | None:
    if not isinstance(raw_value, (int, float)):
        return None

    rating = int(round(float(raw_value)))
    if rating < 0:
        return None
    return min(rating, 100)


def _parse_release_date(raw_value: Any) -> date | None:
    if raw_value is None or not isinstance(raw_value, (int, float)):
        return None

    timestamp = int(raw_value)
    if timestamp <= 0:
        return None

    return datetime.fromtimestamp(timestamp, tz=timezone.utc).date()
