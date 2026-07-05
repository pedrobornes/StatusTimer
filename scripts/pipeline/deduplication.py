"""MD5-based deduplication for harvested platform feed events."""

from __future__ import annotations

import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

from config.settings import settings
from models.feed_events import ScrapedFeedEvent

logger = logging.getLogger(__name__)


class DedupStore:
    """Persists processed event fingerprints between harvest cycles."""

    def __init__(self, state_file: Path) -> None:
        self._state_file = state_file
        self._fingerprints: set[str] = set()
        self.load()

    @classmethod
    def from_settings(cls) -> DedupStore:
        return cls(Path(settings.dedup_state_file))

    def load(self) -> None:
        if not self._state_file.exists():
            return

        try:
            payload = json.loads(self._state_file.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            logger.warning("Could not load dedup state from %s: %s", self._state_file, error)
            return

        if isinstance(payload, list):
            self._fingerprints = {str(item) for item in payload}

    def persist(self) -> None:
        self._state_file.parent.mkdir(parents=True, exist_ok=True)
        self._state_file.write_text(
            json.dumps(sorted(self._fingerprints), indent=2),
            encoding="utf-8",
        )

    def fingerprint(self, event: ScrapedFeedEvent) -> str:
        canonical = "|".join(
            [
                event.source.value,
                event.kind.value,
                event.external_id,
                event.published_at.isoformat(),
                event.plain_text,
            ]
        )
        return hashlib.md5(canonical.encode("utf-8")).hexdigest()

    def is_seen(self, event: ScrapedFeedEvent) -> bool:
        return self.fingerprint(event) in self._fingerprints

    def mark_seen(self, event: ScrapedFeedEvent) -> None:
        self._fingerprints.add(self.fingerprint(event))


def within_lookback_window(
    published_at: datetime,
    *,
    lookback_days: int,
    reference_time: datetime | None = None,
) -> bool:
    reference = reference_time or datetime.now(timezone.utc)
    published = _ensure_aware_utc(published_at)
    cutoff = reference - timedelta(days=lookback_days)
    return published >= cutoff


def filter_recent_events(
    events: list[ScrapedFeedEvent],
    *,
    lookback_days: int | None = None,
) -> list[ScrapedFeedEvent]:
    window_days = lookback_days or settings.feed_lookback_days
    recent = [
        event
        for event in events
        if within_lookback_window(event.published_at, lookback_days=window_days)
    ]
    return sorted(recent, key=lambda event: event.published_at)


def filter_new_events(
    events: list[ScrapedFeedEvent],
    store: DedupStore,
) -> list[ScrapedFeedEvent]:
    fresh_events: list[ScrapedFeedEvent] = []

    for event in sorted(events, key=lambda item: item.published_at):
        if store.is_seen(event):
            continue
        store.mark_seen(event)
        fresh_events.append(event)

    return fresh_events


def _ensure_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
