"""Persist scraped feed events as gaming news in the backend."""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path

from clients.backend_client import BackendClient
from config.settings import settings
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from scrapers.text_utils import is_relevant_gaming_news

logger = logging.getLogger(__name__)

_DIRECT_NEWS_SOURCES = frozenset({FeedSource.STEAM, FeedSource.REDDIT})


def is_direct_news_event(event: ScrapedFeedEvent) -> bool:
    """True when push_news_events owns persistence (Steam/Reddit NEWS feeds)."""
    return event.kind == FeedEventKind.NEWS and event.source in _DIRECT_NEWS_SOURCES


class NewsPushStore:
    """Tracks which feed events were successfully stored in gaming_news."""

    def __init__(self, state_file: Path) -> None:
        self._state_file = state_file
        self._fingerprints: set[str] = set()
        self.load()

    @classmethod
    def from_settings(cls) -> NewsPushStore:
        return cls(Path(settings.dedup_state_file).parent / "pushed_news.json")

    def load(self) -> None:
        if not self._state_file.exists():
            return

        try:
            payload = json.loads(self._state_file.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            logger.warning("Could not load news push state from %s: %s", self._state_file, error)
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
                event.game_tag,
                event.title,
            ]
        )
        return hashlib.md5(canonical.encode("utf-8")).hexdigest()

    def is_pushed(self, event: ScrapedFeedEvent) -> bool:
        return self.fingerprint(event) in self._fingerprints

    def mark_pushed(self, event: ScrapedFeedEvent) -> None:
        self._fingerprints.add(self.fingerprint(event))


def push_news_events(
    client: BackendClient,
    events: list[ScrapedFeedEvent],
    store: NewsPushStore,
) -> int:
    pushed = 0

    for event in sorted(events, key=lambda item: item.published_at, reverse=True):
        if event.kind != FeedEventKind.NEWS:
            continue
        if not is_direct_news_event(event):
            # Other sources must go through skill rewriting before persistence.
            continue
        if store.is_pushed(event):
            continue

        if not is_relevant_gaming_news(event.title, event.plain_text):
            logger.info(
                "Skipping low-signal news for %s: %s",
                event.game_tag,
                event.title,
            )
            continue

        result = client.push_patch_note(event.to_patch_note_payload())
        if not result.success:
            logger.warning(
                "Failed to push news for %s (%s): HTTP %s",
                event.game_tag,
                event.title,
                result.status_code,
            )
            continue

        store.mark_pushed(event)
        pushed += 1

    if pushed > 0:
        store.persist()
        logger.info("Pushed %s news item(s) to backend", pushed)

    return pushed
