"""Daily incremental IGDB upcoming-release harvest scheduling."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config.settings import settings
from models.schemas import GameReleasePayload
from scrapers.igdb_releases import fetch_igdb_upcoming_releases_batch

logger = logging.getLogger(__name__)


def _state_path() -> Path:
    return Path(settings.release_harvest_state_file)


def _load_state() -> dict[str, Any]:
    path = _state_path()
    if not path.exists():
        return {}

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to read release harvest state from %s", path)
        return {}

    return payload if isinstance(payload, dict) else {}


def _save_state(payload: dict[str, Any]) -> None:
    path = _state_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def should_run_release_harvest(*, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    state = _load_state()
    last_raw = state.get("last_harvest_at")
    if not isinstance(last_raw, str):
        return True

    try:
        last_harvest = datetime.fromisoformat(last_raw)
    except ValueError:
        return True

    if last_harvest.tzinfo is None:
        last_harvest = last_harvest.replace(tzinfo=timezone.utc)

    elapsed_hours = (now - last_harvest).total_seconds() / 3600
    return elapsed_hours >= settings.release_harvest_interval_hours


def hours_until_next_release_harvest(*, now: datetime | None = None) -> float:
    now = now or datetime.now(timezone.utc)
    state = _load_state()
    last_raw = state.get("last_harvest_at")
    if not isinstance(last_raw, str):
        return 0.0

    try:
        last_harvest = datetime.fromisoformat(last_raw)
    except ValueError:
        return 0.0

    if last_harvest.tzinfo is None:
        last_harvest = last_harvest.replace(tzinfo=timezone.utc)

    elapsed_hours = (now - last_harvest).total_seconds() / 3600
    remaining = settings.release_harvest_interval_hours - elapsed_hours
    return max(remaining, 0.0)


def fetch_scheduled_upcoming_releases() -> list[GameReleasePayload]:
    if not should_run_release_harvest():
        remaining = hours_until_next_release_harvest()
        logger.info(
            "Release harvest skipped: next batch in %.1fh (interval=%sh).",
            remaining,
            settings.release_harvest_interval_hours,
        )
        return []

    state = _load_state()
    query_offset = state.get("query_offset", 0)
    if not isinstance(query_offset, int) or query_offset < 0:
        query_offset = 0

    releases, raw_count, catalog_exhausted = fetch_igdb_upcoming_releases_batch(
        offset=query_offset,
    )

    next_offset = 0 if catalog_exhausted or raw_count <= 0 else query_offset + raw_count
    _save_state(
        {
            "last_harvest_at": datetime.now(timezone.utc).isoformat(),
            "query_offset": next_offset,
            "last_batch_raw_count": raw_count,
            "last_batch_release_count": len(releases),
            "catalog_exhausted": catalog_exhausted,
        }
    )

    logger.info(
        "Release harvest batch synced: offset=%s raw=%s releases=%s next_offset=%s exhausted=%s",
        query_offset,
        raw_count,
        len(releases),
        next_offset,
        catalog_exhausted,
    )
    return releases
