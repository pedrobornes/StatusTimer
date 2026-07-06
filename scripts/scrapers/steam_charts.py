"""Steam Charts harvester for top played games and store metadata."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import requests

from config.settings import settings
from models.catalog_schemas import GameCatalogEntryPayload
from models.normalization import to_slug
from scrapers.igdb_catalog_enrichment import enrich_catalog_entries_with_igdb
from scrapers.live_metrics import fetch_steam_live_players
from scrapers.parallel_utils import run_parallel

logger = logging.getLogger(__name__)

STEAM_CHARTS_URL = (
    "https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/"
)
STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails"
MANUAL_PROTECTED_SLUGS = frozenset({"valorant", "fortnite"})


@dataclass(frozen=True)
class SteamChartsRank:
    app_id: int
    rank: int


def fetch_steam_charts_ranks(limit: int | None = None) -> list[SteamChartsRank]:
    """Fetch ranked Steam app IDs from the public charts endpoint."""
    params: dict[str, str | int] = {"format": "json"}
    if settings.steam_api_key:
        params["key"] = settings.steam_api_key

    response = requests.get(
        STEAM_CHARTS_URL,
        params=params,
        timeout=settings.request_timeout_seconds,
    )
    response.raise_for_status()
    payload = response.json()

    ranks = payload.get("response", {}).get("ranks", [])
    parsed: list[SteamChartsRank] = []

    for index, entry in enumerate(ranks):
        app_id = entry.get("appid")
        if app_id is None:
            continue

        parsed.append(
            SteamChartsRank(
                app_id=int(app_id),
                rank=int(entry.get("rank", index + 1)),
            )
        )

        if limit is not None and len(parsed) >= limit:
            break

    return parsed


def fetch_steam_app_name(app_id: int, session: requests.Session) -> str | None:
    """Resolve a human-readable title from the Steam Store appdetails endpoint."""
    response = session.get(
        STEAM_APP_DETAILS_URL,
        params={"appids": app_id, "l": "english"},
        timeout=settings.request_timeout_seconds,
    )
    response.raise_for_status()

    entry = response.json().get(str(app_id), {})
    if not entry.get("success"):
        return None

    data = entry.get("data", {})
    name = data.get("name")
    if not isinstance(name, str) or not name.strip():
        return None

    return name.strip()


def build_catalog_entry(
    *,
    app_id: int,
    game_name: str,
    featured: bool = False,
) -> GameCatalogEntryPayload:
    slug = to_slug(game_name)
    return GameCatalogEntryPayload(
        slug=slug,
        game_name=game_name,
        steam_app_id=app_id,
        logo_url=None,
        cover_url=None,
        featured=featured,
    )


@dataclass(frozen=True)
class _RankedCatalogResult:
    list_index: int
    entry: GameCatalogEntryPayload


def _fetch_ranked_catalog_entry(
    indexed_rank: tuple[int, SteamChartsRank],
) -> _RankedCatalogResult | None:
    list_index, rank = indexed_rank

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "StatusTimer-Harvester/1.0 (+steam-charts; public APIs only)",
            "Accept": "application/json",
        }
    )

    try:
        try:
            game_name = fetch_steam_app_name(rank.app_id, session)
        except requests.RequestException as error:
            logger.warning(
                "Steam appdetails failed for app_id=%s: %s",
                rank.app_id,
                error,
            )
            return None

        if game_name is None:
            logger.warning("Steam appdetails returned no name for app_id=%s", rank.app_id)
            return None

        slug = to_slug(game_name)
        if slug in MANUAL_PROTECTED_SLUGS:
            logger.info("Skipping manual protected slug from Steam charts: %s", slug)
            return None

        live_players = fetch_steam_live_players(rank.app_id, session)
        entry = build_catalog_entry(
            app_id=rank.app_id,
            game_name=game_name,
            featured=list_index < 6,
        )
        resolved = (
            entry.model_copy(update={"live_players": live_players})
            if live_players is not None
            else entry
        )
        return _RankedCatalogResult(list_index=list_index, entry=resolved)
    finally:
        session.close()


def fetch_steam_charts_catalog(
    limit: int | None = None,
) -> list[GameCatalogEntryPayload]:
    """
    Build catalog payloads from Steam Charts + appdetails.

    Valorant and Fortnite remain manual-only and are excluded upstream.
    """
    max_entries = limit or settings.steam_charts_top_n
    ranks = fetch_steam_charts_ranks(limit=max_entries)

    ranked_results = run_parallel(
        list(enumerate(ranks)),
        _fetch_ranked_catalog_entry,
    )

    seen_slugs: set[str] = set()
    entries: list[GameCatalogEntryPayload] = []

    for result in sorted(
        (item for item in ranked_results if item is not None),
        key=lambda item: item.list_index,
    ):
        slug = result.entry.slug
        if slug in seen_slugs:
            continue

        seen_slugs.add(slug)
        entries.append(result.entry)

    logger.info("Prepared %s Steam Charts catalog entries", len(entries))
    return enrich_catalog_entries_with_igdb(entries)
