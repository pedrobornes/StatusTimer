"""Canonical slug aliases and pinned game identities for catalog sync."""

from __future__ import annotations

from typing import TypedDict

# Twitch / legacy slugs that must map to a single monitored title.
_ROMAN_SUFFIXES: dict[str, str] = {
    "i": "1",
    "ii": "2",
    "iii": "3",
    "iv": "4",
    "v": "5",
    "vi": "6",
    "vii": "7",
    "viii": "8",
    "ix": "9",
    "x": "10",
}

_NOISE_SUFFIXES = ("tm", "r")

CANONICAL_CATALOG_SLUGS: dict[str, str] = {
    "counter-strike": "counter-strike-2",
    # Canonicalize GTA V variants into the IGDB slug.
    "gta-v": "grand-theft-auto-v",
    "grand-theft-auto-v-legacy": "grand-theft-auto-v",
    "grand-theft-auto-v-enhanced": "grand-theft-auto-v",
    # Canonicalize Overwatch 2 into the IGDB slug.
    "overwatch-2": "overwatch",
    # IGDB uses diablo-iv; Blizzard news feed uses diablo-4.
    "diablo-iv": "diablo-4",
    # IGDB control-resonant--1 → control-resonant-1; Twitch/catalog uses the base slug.
    "control-resonant-1": "control-resonant",
    "control-resonant--1": "control-resonant",
    # IGDB guild-wars-3--1 → guild-wars-3-1.
    "guild-wars-3-1": "guild-wars-3",
    "guild-wars-3--1": "guild-wars-3",
}

MANUAL_PROTECTED_SLUGS = frozenset({"valorant", "fortnite", "counter-strike-2"})

NON_STEAM_PLAYER_TRACKING_SLUGS = frozenset({
    "minecraft",
    "roblox",
    "fortnite",
    "valorant",
    "league-of-legends",
})

BLOCKED_STEAM_APP_IDS_BY_SLUG: dict[str, frozenset[int]] = {
    "minecraft": frozenset({1928870}),
}

# Canonical slug -> known Steam app id (mirrors backend KnownSteamAppRegistry).
KNOWN_STEAM_APP_IDS: dict[str, int] = {
    "arma-reforger": 1874880,
    "sea-of-thieves": 1172620,
    "resident-evil-village": 1196590,
}


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
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar4kon.jpg"
        ),
        "fallback_cover_url": (
            "https://images.igdb.com/igdb/image/upload/t_cover_big/coaczd.jpg"
        ),
    },
    "grand-theft-auto-v": {
        "igdb_slug": "grand-theft-auto-v",
        "igdb_game_id": 1020,
        "steam_app_id": 3240220,
        "blocked_steam_app_ids": frozenset({271590}),
        "blocked_igdb_slugs": frozenset(),
        "fallback_logo_url": (
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar4cy.jpg"
        ),
        "fallback_cover_url": (
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co2lbd.jpg"
        ),
    },
    "overwatch": {
        "igdb_slug": "overwatch--1",
        "igdb_game_id": 125174,
        "steam_app_id": 2357570,
        "blocked_steam_app_ids": frozenset(),
        # Block Overwatch (2016) which uses IGDB slug "overwatch" (id=8173).
        "blocked_igdb_slugs": frozenset({"overwatch"}),
        "fallback_logo_url": (
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar6a9.jpg"
        ),
        "fallback_cover_url": (
            "https://images.igdb.com/igdb/image/upload/t_cover_big/coc99p.jpg"
        ),
    },
    "dead-by-daylight": {
        "igdb_slug": "dead-by-daylight",
        "igdb_game_id": 18866,
        "steam_app_id": 381210,
        "blocked_steam_app_ids": frozenset({3453670}),
        "blocked_igdb_slugs": frozenset(),
        "fallback_logo_url": (
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar8eh.jpg"
        ),
        "fallback_cover_url": (
            "https://images.igdb.com/igdb/image/upload/t_cover_big/co5zky.jpg"
        ),
    },
}


def normalize_catalog_slug(slug: str) -> str:
    """Collapse trademark noise and roman-numeral slug variants into one catalog slug."""
    if not slug:
        return slug

    normalized = slug.strip().lower()

    changed = True
    while changed:
        changed = False
        for suffix in _NOISE_SUFFIXES:
            marker = f"-{suffix}"
            if normalized.endswith(marker):
                normalized = normalized[: -len(marker)]
                changed = True

    parts = normalized.rsplit("-", 1)
    if len(parts) == 2 and len(parts[1]) >= 2 and parts[1] in _ROMAN_SUFFIXES:
        normalized = f"{parts[0]}-{_ROMAN_SUFFIXES[parts[1]]}"

    return CANONICAL_CATALOG_SLUGS.get(normalized, normalized)


def canonical_catalog_slug(slug: str) -> str:
    return normalize_catalog_slug(slug)


def get_pinned_game(slug: str) -> PinnedGame | None:
    return PINNED_GAMES.get(slug)


def suppresses_steam_player_tracking(slug: str) -> bool:
    return canonical_catalog_slug(slug) in NON_STEAM_PLAYER_TRACKING_SLUGS


def resolve_harvest_steam_app_id(slug: str, db_app_id: int | None = None) -> int | None:
    """Prefer pinned/monitored Steam app ids over stale catalog rows."""
    canonical_slug = canonical_catalog_slug(slug)

    if suppresses_steam_player_tracking(canonical_slug):
        return None

    pinned = get_pinned_game(canonical_slug)
    if pinned is not None:
        return pinned["steam_app_id"]

    from scrapers.status import find_monitored_target

    monitored = find_monitored_target(canonical_slug)
    if monitored is not None and monitored.steam_app_id is not None:
        return monitored.steam_app_id

    known_app_id = KNOWN_STEAM_APP_IDS.get(canonical_slug)
    if known_app_id is not None and known_app_id > 0:
        return known_app_id

    if isinstance(db_app_id, int) and db_app_id > 0:
        blocked = pinned["blocked_steam_app_ids"] if pinned is not None else frozenset()
        blocked = blocked | BLOCKED_STEAM_APP_IDS_BY_SLUG.get(canonical_slug, frozenset())
        if db_app_id not in blocked:
            return db_app_id

    return None
