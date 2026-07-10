"""IGDB image URL builders and metadata extraction."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Any

IGDB_IMAGE_BASE = "https://images.igdb.com/igdb/image/upload"
import re

STEAM_EXTERNAL_CATEGORY = 1
STEAM_STORE_URL_PATTERN = re.compile(
    r"store\.steampowered\.com/app/(\d+)",
    re.IGNORECASE,
)
YOUTUBE_VIDEO_ID_PATTERN = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([\w-]{11})",
    re.IGNORECASE,
)
YOUTUBE_CHANNEL_MARKERS = ("/channel/", "/@", "/c/", "/user/")
EPIC_EXTERNAL_CATEGORY = 13
OFFICIAL_WEBSITE_CATEGORY = 1
YOUTUBE_WEBSITE_CATEGORY = 9
STEAM_WEBSITE_CATEGORY = 13
REDDIT_WEBSITE_CATEGORY = 14
EPIC_WEBSITE_CATEGORY = 16
EXTERNAL_LINK_KEYS = frozenset({"steam", "epic", "youtube", "reddit", "official"})
EPIC_STORE_URL_PATTERN = re.compile(r"epicgames\.com/(?:store|en-US)", re.IGNORECASE)
REDDIT_SUBREDDIT_PATTERN = re.compile(r"reddit\.com/r/([\w_]+)", re.IGNORECASE)
MAIN_GAME_CATEGORY = 0
MAIN_GAME_TYPE = 0
REMAKE_GAME_TYPE = 8
REMASTER_GAME_TYPE = 9
EXPANDED_GAME_TYPE = 10
PORT_GAME_TYPE = 11
CATALOG_GAME_TYPES = frozenset(
    {
        MAIN_GAME_TYPE,
        REMAKE_GAME_TYPE,
        REMASTER_GAME_TYPE,
        EXPANDED_GAME_TYPE,
        PORT_GAME_TYPE,
    }
)
CATALOG_GAME_TYPE_FILTER = "(0,8,9,10,11)"
HERO_MIN_WIDTH = 1920
HERO_MIN_HEIGHT = 720
BLOCKED_HERO_IMAGE_IDS = frozenset({"ar667x"})


def is_suitable_hero_url(url: str | None) -> bool:
    if not url or "images.igdb.com" not in url.lower():
        return False

    lower = url.lower()
    if "/t_cover" in lower or "/t_thumb" in lower:
        return False

    image_id = url.rsplit("/", 1)[-1].replace(".jpg", "")
    if image_id in BLOCKED_HERO_IMAGE_IDS or image_id.lower().startswith("sc"):
        return False

    if image_id.lower().startswith("co"):
        return False

    if not image_id.lower().startswith("ar"):
        return False

    return True


def prefer_hero_url(current: str | None, candidate: str | None) -> str | None:
    sanitized_candidate = candidate.strip() if candidate else None
    if sanitized_candidate and is_suitable_hero_url(sanitized_candidate):
        return sanitized_candidate

    sanitized_current = current.strip() if current else None
    if sanitized_current and is_suitable_hero_url(sanitized_current):
        return sanitized_current

    return sanitized_candidate or sanitized_current

IGDB_GAME_FIELDS = (
    "id, name, slug, category, game_type, first_release_date, platforms, genres.name, "
    "cover.image_id, artworks.image_id, artworks.width, artworks.height, screenshots.image_id, screenshots.width, screenshots.height, "
    "hypes, rating, aggregated_rating, "
    "videos.video_id, websites.url, websites.category, "
    "external_games.uid, external_games.category, external_games.url"
)


@dataclass(frozen=True)
class IgdbGameMetadata:
    igdb_game_id: int | None
    name: str
    slug: str
    logo_url: str | None
    cover_url: str | None
    background_url: str | None
    user_rating: int | None
    critic_rating: int | None
    genre_names: list[str] = field(default_factory=list)
    screenshot_urls: list[str] = field(default_factory=list)
    trailer_video_ids: list[str] = field(default_factory=list)
    youtube_channel_url: str | None = None
    external_links: dict[str, str] = field(default_factory=dict)
    hype_count: int = 0
    steam_app_id: int | None = None
    release_date: date | None = None


def igdb_image_url(image_id: str, size: str = "t_cover_big") -> str:
    normalized = image_id.strip()
    return f"{IGDB_IMAGE_BASE}/{size}/{normalized}.jpg"


def is_catalog_game(raw_game: dict[str, Any]) -> bool:
    game_type = raw_game.get("game_type")
    if isinstance(game_type, int):
        return game_type in CATALOG_GAME_TYPES

    category = raw_game.get("category")
    if isinstance(category, int):
        return category == MAIN_GAME_CATEGORY

    return True


def is_main_game(raw_game: dict[str, Any]) -> bool:
    return is_catalog_game(raw_game)


def parse_igdb_game_metadata(raw_game: dict[str, Any]) -> IgdbGameMetadata:
    if not is_main_game(raw_game):
        raise ValueError("IGDB row is not a main_game (category != 0)")

    game_name = str(raw_game.get("name") or "").strip()
    if not game_name:
        raise ValueError("IGDB game is missing name")

    igdb_game_id = raw_game.get("id")
    parsed_id = igdb_game_id if isinstance(igdb_game_id, int) else None

    cover_url = _resolve_cover_url(raw_game.get("cover"))
    logo_url = _resolve_logo_url(raw_game.get("cover"))
    background_url = _resolve_background_url(
        raw_game.get("artworks"),
        raw_game.get("screenshots"),
    )

    youtube_channel_url, website_video_ids = _resolve_youtube_from_websites(
        raw_game.get("websites")
    )
    steam_app_id = _resolve_steam_app_id(raw_game.get("external_games"))
    external_links = _resolve_external_links(
        raw_game.get("websites"),
        raw_game.get("external_games"),
        steam_app_id,
        youtube_channel_url,
    )

    return IgdbGameMetadata(
        igdb_game_id=parsed_id,
        name=game_name,
        slug=str(raw_game.get("slug") or "").strip(),
        logo_url=logo_url,
        cover_url=cover_url,
        background_url=background_url,
        user_rating=_normalize_rating(raw_game.get("rating")),
        critic_rating=_normalize_rating(raw_game.get("aggregated_rating")),
        genre_names=_resolve_genre_names(raw_game.get("genres")),
        screenshot_urls=_resolve_screenshot_urls(raw_game.get("screenshots")),
        trailer_video_ids=_merge_unique_strings(
            _resolve_trailer_ids(raw_game.get("videos")),
            website_video_ids,
        ),
        youtube_channel_url=youtube_channel_url,
        external_links=external_links,
        hype_count=_resolve_hype_count(raw_game.get("hypes")),
        steam_app_id=steam_app_id,
        release_date=_parse_release_date(raw_game.get("first_release_date")),
    )


def _resolve_cover_url(raw_cover: Any) -> str | None:
    image_id = _extract_image_id(raw_cover)
    if image_id is None:
        return None
    return igdb_image_url(image_id, "t_cover_big")


def _resolve_logo_url(raw_cover: Any) -> str | None:
    """Small vertical box art for search thumbnails and icons."""
    image_id = _extract_image_id(raw_cover)
    if image_id is None:
        return None
    return igdb_image_url(image_id, "t_cover_small")


def _resolve_background_url(raw_artworks: Any, raw_screenshots: Any) -> str | None:
    """Pick a banner hero from official IGDB artworks only."""
    best_artwork = _select_best_landscape_hero(raw_artworks)
    if best_artwork is not None:
        return best_artwork

    return _select_first_hero(raw_artworks)


def _select_best_landscape_hero(raw_images: Any) -> str | None:
    images = raw_images if isinstance(raw_images, list) else []
    best_landscape: tuple[int, str] | None = None

    for image in images:
        image_id = _extract_image_id(image)
        if image_id is None or image_id in BLOCKED_HERO_IMAGE_IDS:
            continue

        if not image_id.lower().startswith("ar"):
            continue

        if not isinstance(image, dict):
            continue

        width = image.get("width")
        height = image.get("height")
        if not isinstance(width, int) or not isinstance(height, int) or width <= 0 or height <= 0:
            continue
        if width <= height:
            continue
        if width < HERO_MIN_WIDTH or height < HERO_MIN_HEIGHT:
            continue

        hero_url = igdb_image_url(image_id, "t_screenshot_huge")
        area = width * height
        candidate = (area, hero_url)
        if best_landscape is None or candidate[0] > best_landscape[0]:
            best_landscape = candidate

    if best_landscape is not None:
        return best_landscape[1]

    return None


def _select_first_hero(raw_images: Any) -> str | None:
    images = raw_images if isinstance(raw_images, list) else []
    for image in images:
        image_id = _extract_image_id(image)
        if image_id is None or image_id in BLOCKED_HERO_IMAGE_IDS:
            continue

        if not image_id.lower().startswith("ar"):
            continue

        if isinstance(image, dict):
            width = image.get("width")
            height = image.get("height")
            if not isinstance(width, int) or not isinstance(height, int):
                continue
            if width < HERO_MIN_WIDTH or height < HERO_MIN_HEIGHT or width <= height:
                continue
        else:
            continue

        return igdb_image_url(image_id, "t_screenshot_huge")

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


def _merge_unique_strings(existing: list[str], extra: list[str]) -> list[str]:
    seen = set(existing)
    merged = list(existing)

    for value in extra:
        if value not in seen:
            seen.add(value)
            merged.append(value)

    return merged


def _resolve_youtube_from_websites(raw_websites: Any) -> tuple[str | None, list[str]]:
    websites = raw_websites if isinstance(raw_websites, list) else []
    channel_url: str | None = None
    video_ids: list[str] = []

    for website in websites:
        if not isinstance(website, dict):
            continue

        url = website.get("url")
        if not isinstance(url, str):
            continue

        normalized_url = url.strip()
        if not normalized_url:
            continue

        lowered = normalized_url.lower()
        if "youtube.com" not in lowered and "youtu.be" not in lowered:
            continue

        video_id = _parse_youtube_video_id(normalized_url)
        if video_id is not None:
            video_ids.append(video_id)
            continue

        if _is_youtube_channel_url(normalized_url):
            channel_url = channel_url or normalized_url

    return channel_url, video_ids


def _parse_youtube_video_id(url: str) -> str | None:
    match = YOUTUBE_VIDEO_ID_PATTERN.search(url)
    if match is None:
        return None

    video_id = match.group(1).strip()
    return video_id or None


def _is_youtube_channel_url(url: str) -> bool:
    lowered = url.lower()
    if "youtube.com" not in lowered:
        return False

    return any(marker in lowered for marker in YOUTUBE_CHANNEL_MARKERS)


def _resolve_external_links(
    raw_websites: Any,
    raw_external_games: Any,
    steam_app_id: int | None,
    youtube_channel_url: str | None,
) -> dict[str, str]:
    links: dict[str, str] = {}

    websites = raw_websites if isinstance(raw_websites, list) else []
    for website in websites:
        if not isinstance(website, dict):
            continue

        url = website.get("url")
        if not isinstance(url, str):
            continue

        normalized_url = url.strip()
        if not normalized_url:
            continue

        category = website.get("category")
        if category == OFFICIAL_WEBSITE_CATEGORY:
            links["official"] = normalized_url
            continue

        if category == REDDIT_WEBSITE_CATEGORY:
            reddit_url = _normalize_reddit_url(normalized_url)
            if reddit_url is not None:
                links["reddit"] = reddit_url
            continue

        if category == EPIC_WEBSITE_CATEGORY or _is_epic_store_url(normalized_url):
            links["epic"] = normalized_url
            continue

        if category == STEAM_WEBSITE_CATEGORY or _parse_steam_app_id_from_url(normalized_url):
            links["steam"] = normalized_url
            continue

        if category == YOUTUBE_WEBSITE_CATEGORY and _is_youtube_channel_url(normalized_url):
            links["youtube"] = normalized_url
            continue

        lowered = normalized_url.lower()
        if "reddit.com/r/" in lowered:
            reddit_url = _normalize_reddit_url(normalized_url)
            if reddit_url is not None:
                links["reddit"] = reddit_url
        elif _is_epic_store_url(normalized_url):
            links["epic"] = normalized_url
        elif _parse_steam_app_id_from_url(normalized_url):
            links["steam"] = normalized_url
        elif "youtube.com" in lowered and _is_youtube_channel_url(normalized_url):
            links["youtube"] = normalized_url

    external_games = raw_external_games if isinstance(raw_external_games, list) else []
    for entry in external_games:
        if not isinstance(entry, dict):
            continue

        url = entry.get("url")
        normalized_url = url.strip() if isinstance(url, str) else ""
        category = entry.get("category")

        if category == STEAM_EXTERNAL_CATEGORY or _parse_steam_app_id_from_url(normalized_url):
            if normalized_url:
                links["steam"] = normalized_url
            continue

        if category == EPIC_EXTERNAL_CATEGORY or _is_epic_store_url(normalized_url):
            if normalized_url:
                links["epic"] = normalized_url

    if steam_app_id is not None and steam_app_id > 0 and "steam" not in links:
        links["steam"] = f"https://store.steampowered.com/app/{steam_app_id}/"

    if youtube_channel_url and "youtube" not in links:
        links["youtube"] = youtube_channel_url

    return {key: links[key] for key in EXTERNAL_LINK_KEYS if key in links and links[key]}


def _is_epic_store_url(url: str) -> bool:
    return EPIC_STORE_URL_PATTERN.search(url) is not None


def _normalize_reddit_url(url: str) -> str | None:
    match = REDDIT_SUBREDDIT_PATTERN.search(url)
    if match is None:
        return None

    subreddit = match.group(1).strip()
    if not subreddit:
        return None

    return f"https://www.reddit.com/r/{subreddit}/"


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


def _parse_steam_uid(raw_uid: Any) -> int | None:
    if isinstance(raw_uid, str) and raw_uid.isdigit():
        return int(raw_uid)
    if isinstance(raw_uid, int) and raw_uid > 0:
        return raw_uid
    return None


def _parse_steam_app_id_from_url(url: str) -> int | None:
    match = STEAM_STORE_URL_PATTERN.search(url)
    if match is None:
        return None

    app_id = int(match.group(1))
    return app_id if app_id > 0 else None


def _resolve_steam_app_id(raw_external_games: Any) -> int | None:
    entries = raw_external_games if isinstance(raw_external_games, list) else []
    fallback_from_url: int | None = None

    for entry in entries:
        if not isinstance(entry, dict):
            continue

        if entry.get("category") == STEAM_EXTERNAL_CATEGORY:
            parsed_uid = _parse_steam_uid(entry.get("uid"))
            if parsed_uid is not None:
                return parsed_uid

        url = entry.get("url")
        if isinstance(url, str):
            parsed_url = _parse_steam_app_id_from_url(url)
            if parsed_url is not None:
                fallback_from_url = parsed_url

    return fallback_from_url


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


_DISAMBIGUATED_SLUG_PATTERN = re.compile(r"--\d+$")


def is_disambiguated_igdb_slug(igdb_slug: str | None) -> bool:
    """
    IGDB appends a ``--N`` suffix (fable--1, fable--2, ...) only when a title
    collides with an existing name in its database. That suffix is therefore a
    reliable, source-provided signal that a game is a "repeat" of another and
    should be disambiguated for humans.
    """
    return bool(igdb_slug and _DISAMBIGUATED_SLUG_PATTERN.search(igdb_slug))


def resolve_display_name(metadata: IgdbGameMetadata) -> str:
    """
    Human-facing name. For IGDB-disambiguated titles (e.g. the "Fable" reboot,
    slug ``fable--1``) append the release year so the UI can tell duplicates
    apart — "Fable (2027)" vs the original "Fable".
    """
    if is_disambiguated_igdb_slug(metadata.slug) and metadata.release_date:
        return f"{metadata.name} ({metadata.release_date.year})"

    return metadata.name


def resolve_hero_url(metadata: IgdbGameMetadata) -> str | None:
    """Landscape artwork/screenshot only — never box art or gameplay HUD shots."""
    if metadata.background_url and is_suitable_hero_url(metadata.background_url):
        return metadata.background_url

    return None


def resolve_catalog_image_urls(
    metadata: IgdbGameMetadata,
) -> tuple[str | None, str | None]:
    """
    Map IGDB metadata to backend catalog fields.

    cover_url  -> vertical box art (t_cover_big)
    logo_url   -> horizontal hero background (artwork -> screenshot -> cover)
    """
    cover_url = metadata.cover_url
    hero_url = resolve_hero_url(metadata)
    return hero_url, cover_url
