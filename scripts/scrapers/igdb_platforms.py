"""IGDB platform allowlist for catalog ingestion (PC / PS5 / Xbox)."""

from __future__ import annotations

from typing import Any

# IGDB platform ids we track. A game is eligible when at least one of these is present
# (e.g. Switch + PC is OK because PC is included).
SUPPORTED_IGDB_PLATFORM_IDS: frozenset[int] = frozenset(
    {
        6,  # PC (Microsoft Windows)
        14,  # Mac (often bundled with PC releases)
        49,  # Xbox One
        167,  # PlayStation 5
        169,  # Xbox Series X|S
    }
)


def parse_igdb_platform_ids(raw_platforms: Any) -> list[int]:
    if not isinstance(raw_platforms, list):
        return []

    parsed: list[int] = []
    for platform_id in raw_platforms:
        if isinstance(platform_id, int) and platform_id > 0:
            parsed.append(platform_id)
    return parsed


def has_supported_igdb_platform(raw_platforms: Any) -> bool:
    platform_ids = parse_igdb_platform_ids(raw_platforms)
    if not platform_ids:
        return False

    return any(platform_id in SUPPORTED_IGDB_PLATFORM_IDS for platform_id in platform_ids)


def is_eligible_for_igdb_discovery(raw_platforms: Any) -> bool:
    """Accept missing platforms during IGDB text search (API often omits the field)."""
    platform_ids = parse_igdb_platform_ids(raw_platforms)
    if not platform_ids:
        return True

    return has_supported_igdb_platform(raw_platforms)
