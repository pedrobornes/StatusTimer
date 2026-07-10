"""Orchestrates official platform feed scrapers."""

from __future__ import annotations

import logging

import requests

from config.settings import settings
from models.feed_events import ScrapedFeedEvent
from scrapers.blizzard_news import fetch_blizzard_news_events
from scrapers.epic_news import fetch_epic_news_events
from scrapers.epic_status import fetch_epic_incident_events
from scrapers.http_client import build_http_session
from scrapers.riot_news import fetch_riot_news_events
from scrapers.riot_status import fetch_riot_incident_events
from scrapers.reddit_news import fetch_reddit_news_events
from scrapers.steam_news import fetch_steam_news_events

logger = logging.getLogger(__name__)


def fetch_all_platform_feed_events(
    session: requests.Session | None = None,
) -> list[ScrapedFeedEvent]:
    """Fetch Steam news plus official incident feeds in one pass."""
    shared_session = session or build_http_session()
    events: list[ScrapedFeedEvent] = []

    fetchers = [
        fetch_steam_news_events,
        fetch_riot_news_events,
        fetch_blizzard_news_events,
        fetch_epic_news_events,
        fetch_riot_incident_events,
        fetch_epic_incident_events,
    ]
    if settings.enable_reddit_news:
        fetchers.insert(1, fetch_reddit_news_events)
    else:
        logger.info("Reddit news ingestion disabled (ENABLE_REDDIT_NEWS=false)")

    for fetcher in fetchers:
        try:
            events.extend(fetcher(shared_session))
        except Exception:
            logger.exception("Platform feed scraper failed: %s", fetcher.__name__)

    logger.info("Platform feed harvest collected %s total events", len(events))
    return events
