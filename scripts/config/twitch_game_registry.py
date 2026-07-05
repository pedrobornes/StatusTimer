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
}


def resolve_twitch_lookup_name(target: "MonitoredGameTarget") -> str:
    """Return the Twitch category name used to resolve a Helix game id."""
    return MONITORED_TWITCH_GAME_NAMES.get(target.slug, target.display_name)
