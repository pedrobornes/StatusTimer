"""Twitch Helix harvester for top games by live viewership rank."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import requests

from config.settings import settings
from config.game_slug_registry import normalize_catalog_slug
from models.catalog_schemas import GameCatalogEntryPayload
from scrapers.igdb_catalog_enrichment import enrich_catalog_entries_with_igdb
from models.normalization import to_slug
from scrapers.live_metrics import fetch_twitch_viewers
from scrapers.twitch_auth import get_twitch_access_token
from scrapers.twitch_helix import (
    helix_get,
    run_twitch_batched,
    should_enrich_twitch_viewers_for_rank,
    twitch_guard,
)

logger = logging.getLogger(__name__)

TWITCH_HELIX_GAMES_TOP_URL = "https://api.twitch.tv/helix/games/top"
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
        "games + demos",
        "animals, aquariums,and zoos",
        "animals, aquariums, and zoos",
    }
)


@dataclass(frozen=True)
class TwitchTopGameEntry:
    twitch_game_id: str
    game_name: str
    slug: str
    twitch_rank: int
    twitch_viewers: int | None


def is_non_game_category(game_name: str) -> bool:
    return game_name.strip().casefold() in NON_GAME_CATEGORIES


def parse_twitch_top_game(game: dict, rank: int) -> TwitchTopGameEntry | None:
    twitch_game_id = game.get("id")
    game_name = game.get("name")

    if not isinstance(twitch_game_id, str) or not twitch_game_id:
        return None
    if not isinstance(game_name, str) or not game_name.strip():
        return None

    normalized_name = game_name.strip()
    if is_non_game_category(normalized_name):
        return None

    slug = normalize_catalog_slug(to_slug(normalized_name))
    if not slug:
        return None

    return TwitchTopGameEntry(
        twitch_game_id=twitch_game_id,
        game_name=normalized_name,
        slug=slug,
        twitch_rank=rank,
        twitch_viewers=None,
    )


def build_catalog_entry(
    entry: TwitchTopGameEntry,
    *,
    featured: bool = False,
) -> GameCatalogEntryPayload:
    canonical_slug = normalize_catalog_slug(entry.slug)
    return GameCatalogEntryPayload(
        slug=canonical_slug,
        game_name=entry.game_name,
        logo_url=None,
        cover_url=None,
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
    """Fetch live viewer counts in tier-aware batches (no parallel burst)."""
    if not entries or not twitch_guard.check_available():
        return entries

    enrichable = [
        entry for entry in entries if should_enrich_twitch_viewers_for_rank(entry.twitch_rank)
    ]
    skipped_ranks = len(entries) - len(enrichable)
    if skipped_ranks > 0:
        logger.info(
            "Skipping Twitch viewer enrichment for %s lower-priority rank(s).",
            skipped_ranks,
        )

    if not enrichable:
        return entries

    session = _build_twitch_session(access_token)

    def fetch_viewers(entry: TwitchTopGameEntry) -> TwitchTopGameEntry:
        try:
            twitch_viewers = fetch_twitch_viewers(entry.twitch_game_id, session)
        except Exception:
            twitch_viewers = None

        return TwitchTopGameEntry(
            twitch_game_id=entry.twitch_game_id,
            game_name=entry.game_name,
            slug=entry.slug,
            twitch_rank=entry.twitch_rank,
            twitch_viewers=twitch_viewers,
        )

    try:
        enriched_by_slug = {
            entry.slug: entry
            for entry in run_twitch_batched(enrichable, fetch_viewers)
            if entry is not None
        }
    finally:
        session.close()

    return [
        enriched_by_slug.get(entry.slug, entry)
        for entry in entries
    ]


def _fetch_top_games_page(
    session: requests.Session,
    *,
    first: int,
    after: str | None = None,
) -> tuple[list[dict], str | None]:
    params: dict[str, str | int] = {"first": first}
    if after:
        params["after"] = after

    response = helix_get(
        session,
        TWITCH_HELIX_GAMES_TOP_URL,
        params=params,
    )
    if response is None:
        raise RuntimeError("Twitch /games/top request blocked or rate-limited")

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
    payloads = [
        build_catalog_entry(entry, featured=entry.twitch_rank <= 6)
        for entry in entries
    ]
    return enrich_catalog_entries_with_igdb(payloads)
