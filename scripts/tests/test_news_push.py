"""Tests for news push persistence helpers."""

from datetime import datetime, timezone
from pathlib import Path

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.news_push import NewsPushStore, push_news_events
from unittest.mock import Mock


def _sample_event(external_id: str = "news-1") -> ScrapedFeedEvent:
    return ScrapedFeedEvent(
        source=FeedSource.STEAM,
        kind=FeedEventKind.NEWS,
        external_id=external_id,
        game_tag="valorant",
        title="Patch notes",
        plain_text="Servers are stable.",
        published_at=datetime(2026, 7, 6, tzinfo=timezone.utc),
    )


def test_push_news_events_persists_after_success(tmp_path: Path) -> None:
    store = NewsPushStore(tmp_path / "pushed_news.json")
    client = Mock(spec=BackendClient)
    client.push_patch_note.return_value = PushResult(success=True, status_code=201)

    pushed = push_news_events(client, [_sample_event()], store)

    assert pushed == 1
    assert store.is_pushed(_sample_event())
    client.push_patch_note.assert_called_once()


def test_push_news_events_skips_already_pushed(tmp_path: Path) -> None:
    store = NewsPushStore(tmp_path / "pushed_news.json")
    client = Mock(spec=BackendClient)
    client.push_patch_note.return_value = PushResult(success=True, status_code=201)

    push_news_events(client, [_sample_event()], store)
    pushed_again = push_news_events(client, [_sample_event()], store)

    assert pushed_again == 0
    client.push_patch_note.assert_called_once()
