"""Canonical slug aliases and pinned game identities for catalog sync."""

from __future__ import annotations

from typing import TypedDict

# Twitch / legacy slugs that must map to a single monitored title.
CANONICAL_CATALOG_SLUGS: dict[str, str] = {
    "counter-strike": "counter-strike-2",
}

MANUAL_PROTECTED_SLUGS = frozenset({"valorant", "fortnite", "counter-strike-2"})


class PinnedGame(TypedDict):
    igdb_slug: str
    igdb_game_id: int
    steam_app_id: int
    blocked_steam_app_ids: frozenset[int]
    blocked_igdb_slugs: frozenset[str]
    fallback_logo_url: str
    fallback_cover_url: str


PINNED_GAMES: dict[str, PinnedGame] = {
    "counter-strike-2": {
        "igdb_slug": "counter-strike-2",
        "igdb_game_id": 242408,
        "steam_app_id": 730,
        "blocked_steam_app_ids": frozenset({10}),
        "blocked_igdb_slugs": frozenset({"counter-strike"}),
        "fallback_logo_url": (
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar439t.jpg"
        ),
        "fallback_cover_url": (
            "https://images.igdb.com/igdb/image/upload/t_cover_big/coaczd.jpg"
        ),
    }
}


def canonical_catalog_slug(slug: str) -> str:
    return CANONICAL_CATALOG_SLUGS.get(slug, slug)


def get_pinned_game(slug: str) -> PinnedGame | None:
    return PINNED_GAMES.get(slug)


def resolve_harvest_steam_app_id(slug: str, db_app_id: int | None = None) -> int | None:
    """Prefer pinned/monitored Steam app ids over stale catalog rows."""
    canonical_slug = canonical_catalog_slug(slug)

    pinned = get_pinned_game(canonical_slug)
    if pinned is not None:
        return pinned["steam_app_id"]

    from scrapers.status import find_monitored_target

    monitored = find_monitored_target(canonical_slug)
    if monitored is not None and monitored.steam_app_id is not None:
        return monitored.steam_app_id

    if isinstance(db_app_id, int) and db_app_id > 0:
        blocked = pinned["blocked_steam_app_ids"] if pinned is not None else frozenset()
        if db_app_id not in blocked:
            return db_app_id

    return None
