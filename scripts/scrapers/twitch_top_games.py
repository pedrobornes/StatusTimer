"""Twitch Helix harvester for top games by live viewership rank."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import requests

from config.settings import settings
from models.catalog_schemas import GameCatalogEntryPayload
from models.normalization import to_slug
from scrapers.live_metrics import fetch_twitch_viewers
from scrapers.parallel_utils import run_parallel
from scrapers.platform_images import twitch_box_art_url
from scrapers.twitch_auth import get_twitch_access_token

logger = logging.getLogger(__name__)

TWITCH_HELIX_GAMES_TOP_URL = "https://api.twitch.tv/helix/games/top"
TWITCH_LOGO_BOX_ART_SIZE = (285, 380)
TWITCH_COVER_BOX_ART_SIZE = (600, 800)
TWITCH_PAGE_SIZE_MAX = 100

NON_GAME_CATEGORIES = frozenset(
    {
        "just chatting",
        "irl",
        "art",
        "music",
        "asmr",
        "slots",
        "talk shows & podcasts",
        "pools, hot tubs, and beaches",
        "sports",
        "special events",
        "software and game development",
    }
)


@dataclass(frozen=True)
class TwitchTopGameEntry:
    twitch_game_id: str
    game_name: str
    slug: str
    twitch_rank: int
    twitch_viewers: int | None
    logo_url: str
    cover_url: str


def is_non_game_category(game_name: str) -> bool:
    return game_name.strip().casefold() in NON_GAME_CATEGORIES


def resolve_twitch_logo_url(box_art_url: str) -> str:
    width, height = TWITCH_LOGO_BOX_ART_SIZE
    return twitch_box_art_url(box_art_url, width, height)


def resolve_twitch_cover_url(box_art_url: str) -> str:
    width, height = TWITCH_COVER_BOX_ART_SIZE
    return twitch_box_art_url(box_art_url, width, height)


def parse_twitch_top_game(game: dict, rank: int) -> TwitchTopGameEntry | None:
    twitch_game_id = game.get("id")
    game_name = game.get("name")
    box_art_url = game.get("box_art_url")

    if not isinstance(twitch_game_id, str) or not twitch_game_id:
        return None
    if not isinstance(game_name, str) or not game_name.strip():
        return None
    if not isinstance(box_art_url, str) or not box_art_url:
        return None

    normalized_name = game_name.strip()
    if is_non_game_category(normalized_name):
        return None

    slug = to_slug(normalized_name)
    if not slug:
        return None

    return TwitchTopGameEntry(
        twitch_game_id=twitch_game_id,
        game_name=normalized_name,
        slug=slug,
        twitch_rank=rank,
        twitch_viewers=None,
        logo_url=resolve_twitch_logo_url(box_art_url),
        cover_url=resolve_twitch_cover_url(box_art_url),
    )


def build_catalog_entry(
    entry: TwitchTopGameEntry,
    *,
    featured: bool = False,
) -> GameCatalogEntryPayload:
    return GameCatalogEntryPayload(
        slug=entry.slug,
        game_name=entry.game_name,
        logo_url=None,
        cover_url=entry.cover_url,
        twitch_game_id=entry.twitch_game_id,
        twitch_rank=entry.twitch_rank,
        twitch_viewers=entry.twitch_viewers,
        featured=featured,
    )


def _build_twitch_session(access_token: str) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "Client-Id": settings.twitch_client_id,
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": "StatusTimer-Harvester/1.0 (+twitch-top-games; Helix API)",
        }
    )
    return session


def _enrich_twitch_viewers(
    entries: list[TwitchTopGameEntry],
    access_token: str,
) -> list[TwitchTopGameEntry]:
    """Fetch live viewer counts for all entries concurrently."""

    def fetch_viewers(entry: TwitchTopGameEntry) -> TwitchTopGameEntry:
        session = _build_twitch_session(access_token)
        try:
            twitch_viewers = fetch_twitch_viewers(entry.twitch_game_id, session)
        finally:
            session.close()

        return TwitchTopGameEntry(
            twitch_game_id=entry.twitch_game_id,
            game_name=entry.game_name,
            slug=entry.slug,
            twitch_rank=entry.twitch_rank,
            twitch_viewers=twitch_viewers,
            logo_url=entry.logo_url,
            cover_url=entry.cover_url,
        )

    return run_parallel(entries, fetch_viewers)


def _fetch_top_games_page(
    session: requests.Session,
    *,
    first: int,
    after: str | None = None,
) -> tuple[list[dict], str | None]:
    params: dict[str, str | int] = {"first": first}
    if after:
        params["after"] = after

    response = session.get(
        TWITCH_HELIX_GAMES_TOP_URL,
        params=params,
        timeout=settings.request_timeout_seconds,
    )
    response.raise_for_status()

    payload = response.json()
    data = payload.get("data", [])
    if not isinstance(data, list):
        raise RuntimeError("Unexpected Twitch /games/top payload: missing data list")

    pagination = payload.get("pagination", {})
    cursor = None
    if isinstance(pagination, dict):
        raw_cursor = pagination.get("cursor")
        if isinstance(raw_cursor, str) and raw_cursor:
            cursor = raw_cursor

    games = [entry for entry in data if isinstance(entry, dict)]
    return games, cursor


def fetch_twitch_top_games(limit: int | None = None) -> list[TwitchTopGameEntry]:
    """
    Fetch the current Twitch top games list ordered by aggregate viewership.

    Non-game Twitch categories are filtered out and ranks are reassigned
    consecutively from 1..N for the remaining valid titles.
    """
    if not settings.twitch_client_id or not settings.twitch_client_secret:
        logger.warning(
            "Twitch credentials not configured; skipping top games harvest."
        )
        return []

    max_entries = limit or settings.twitch_top_n
    if max_entries <= 0:
        return []

    access_token = get_twitch_access_token()
    session = _build_twitch_session(access_token)

    entries: list[TwitchTopGameEntry] = []
    seen_slugs: set[str] = set()
    cursor: str | None = None

    while len(entries) < max_entries:
        games, cursor = _fetch_top_games_page(
            session,
            first=TWITCH_PAGE_SIZE_MAX,
            after=cursor,
        )

        if not games:
            break

        for game in games:
            game_name = game.get("name")
            if isinstance(game_name, str) and is_non_game_category(game_name):
                logger.info("Skipping non-game Twitch category: %s", game_name.strip())
                continue

            rank = len(entries) + 1
            parsed = parse_twitch_top_game(game, rank)
            if parsed is None:
                logger.warning("Skipping malformed Twitch top game payload: %s", game)
                continue

            if parsed.slug in seen_slugs:
                logger.info(
                    "Skipping duplicate Twitch slug at rank %s: %s",
                    rank,
                    parsed.slug,
                )
                continue

            seen_slugs.add(parsed.slug)
            entries.append(parsed)

            if len(entries) >= max_entries:
                break

        if not cursor:
            break

    if entries:
        entries = _enrich_twitch_viewers(entries, access_token)

    logger.info("Prepared %s Twitch top game entries", len(entries))
    return entries


def fetch_twitch_top_games_catalog(
    limit: int | None = None,
) -> list[GameCatalogEntryPayload]:
    """Build catalog payloads from the filtered Twitch top games list."""
    entries = fetch_twitch_top_games(limit=limit)
    return [
        build_catalog_entry(entry, featured=entry.twitch_rank <= 6)
        for entry in entries
    ]
