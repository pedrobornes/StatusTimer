"""Twitch category name overrides for monitored game slugs."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from scrapers.status import MonitoredGameTarget

# Monitored slug -> exact Twitch Helix /games category name
MONITORED_TWITCH_GAME_NAMES: dict[str, str] = {
    "counter-strike-2": "Counter-Strike",
    "pubg": "PUBG: Battlegrounds",
    "call-of-duty": "Call of Duty",
    "gta-v": "Grand Theft Auto V",
    "overwatch-2": "Overwatch 2",
    "sea-of-thieves": "Sea of Thieves",
    "resident-evil-village": "Resident Evil Village",
}

# IGDB edition SKUs share one Twitch directory category with the base franchise.
_FRANCHISE_TWITCH_CATEGORY_PREFIXES: dict[str, str] = {
    "sea-of-thieves": "Sea of Thieves",
    "resident-evil-village": "Resident Evil Village",
}


def resolve_twitch_lookup_name(target: "MonitoredGameTarget") -> str:
    """Return the Twitch category name used to resolve a Helix game id."""
    mapped = MONITORED_TWITCH_GAME_NAMES.get(target.slug)
    if mapped is not None:
        return mapped

    for prefix, category_name in _FRANCHISE_TWITCH_CATEGORY_PREFIXES.items():
        if target.slug == prefix or target.slug.startswith(f"{prefix}-"):
            return category_name

    return target.display_name
