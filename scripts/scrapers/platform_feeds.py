"""Orchestrates official platform feed scrapers."""

from __future__ import annotations

import logging

import requests

from models.feed_events import ScrapedFeedEvent
from scrapers.epic_status import fetch_epic_incident_events
from scrapers.http_client import build_http_session
from scrapers.riot_status import fetch_riot_incident_events
from scrapers.steam_news import fetch_steam_news_events

logger = logging.getLogger(__name__)


def fetch_all_platform_feed_events(
    session: requests.Session | None = None,
) -> list[ScrapedFeedEvent]:
    """Fetch Steam news, Riot incidents, and Epic incidents in one pass."""
    shared_session = session or build_http_session()
    events: list[ScrapedFeedEvent] = []

    for fetcher in (
        fetch_steam_news_events,
        fetch_riot_incident_events,
        fetch_epic_incident_events,
    ):
        try:
            events.extend(fetcher(shared_session))
        except Exception:
            logger.exception("Platform feed scraper failed: %s", fetcher.__name__)

    logger.info("Platform feed harvest collected %s total events", len(events))
    return events
