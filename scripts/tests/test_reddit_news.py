"""Tests for Reddit news scraper."""

from datetime import timezone

from models.feed_events import FeedEventKind, FeedSource
from scrapers.reddit_news import RedditNewsScraper, parse_subreddit_from_url


SAMPLE_ATOM = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Patch 1.2.0 is live</title>
    <link rel="alternate" href="https://www.reddit.com/r/testsub/comments/abc123/patch/" />
    <id>tag:reddit.com,2026:/r/testsub/comments/abc123</id>
    <updated>2026-07-07T12:00:00Z</updated>
    <content type="html">&lt;p&gt;This update includes balance changes, bug fixes, and new seasonal content for players.&lt;/p&gt;</content>
  </entry>
</feed>
"""


def test_parse_subreddit_from_url() -> None:
    assert parse_subreddit_from_url("https://www.reddit.com/r/InfinityNikkiofficial") == "InfinityNikkiofficial"


def test_parse_atom_feed_builds_reddit_news_event() -> None:
    scraper = RedditNewsScraper()
    events = scraper.parse_feed_xml(
        SAMPLE_ATOM,
        game_tag="infinity-nikki",
        game_name="Infinity Nikki",
        subreddit="testsub",
    )

    assert len(events) == 1
    event = events[0]
    assert event.source == FeedSource.REDDIT
    assert event.kind == FeedEventKind.NEWS
    assert event.game_tag == "infinity-nikki"
    assert "Patch 1.2.0" in event.title
    assert event.published_at.tzinfo == timezone.utc
