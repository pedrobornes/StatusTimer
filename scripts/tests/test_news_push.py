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


def test_push_news_events_skips_low_signal_items(tmp_path: Path) -> None:
    store = NewsPushStore(tmp_path / "pushed_news.json")
    client = Mock(spec=BackendClient)
    client.push_patch_note.return_value = PushResult(success=True, status_code=201)

    survey_event = ScrapedFeedEvent(
        source=FeedSource.STEAM,
        kind=FeedEventKind.NEWS,
        external_id="survey-1",
        game_tag="battlefield-6",
        title="Battlefield 6 Steam Discussions Survey",
        plain_text="Please take this 9-question survey about the community space.",
        published_at=datetime(2026, 7, 6, tzinfo=timezone.utc),
    )

    pushed = push_news_events(client, [survey_event], store)

    assert pushed == 0
    client.push_patch_note.assert_not_called()


def test_push_news_events_accepts_reddit_sources(tmp_path: Path) -> None:
    store = NewsPushStore(tmp_path / "pushed_news.json")
    client = Mock(spec=BackendClient)
    client.push_patch_note.return_value = PushResult(success=True, status_code=201)

    reddit_event = ScrapedFeedEvent(
        source=FeedSource.REDDIT,
        kind=FeedEventKind.NEWS,
        external_id="reddit-1",
        game_tag="infinity-nikki",
        title="Patch 1.2.0 is live",
        plain_text="This update includes balance changes, bug fixes, and new seasonal content.",
        published_at=datetime(2026, 7, 6, tzinfo=timezone.utc),
    )

    pushed = push_news_events(client, [reddit_event], store)

    assert pushed == 1
    client.push_patch_note.assert_called_once()


def test_push_news_events_skips_non_steam_sources(tmp_path: Path) -> None:
    store = NewsPushStore(tmp_path / "pushed_news.json")
    client = Mock(spec=BackendClient)
    client.push_patch_note.return_value = PushResult(success=True, status_code=201)

    riot_event = ScrapedFeedEvent(
        source=FeedSource.RIOT,
        kind=FeedEventKind.NEWS,
        external_id="riot-1",
        game_tag="valorant",
        title="Service update",
        plain_text="Some update from Riot.",
        published_at=datetime(2026, 7, 6, tzinfo=timezone.utc),
    )

    pushed = push_news_events(client, [riot_event], store)

    assert pushed == 0
    client.push_patch_note.assert_not_called()
