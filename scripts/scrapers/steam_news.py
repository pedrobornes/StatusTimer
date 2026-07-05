"""Steam official RSS/XML news feed scraper."""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import requests

from config.settings import settings
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from scrapers.http_client import build_http_session, fetch_text
from scrapers.text_utils import plain_text_from_html

logger = logging.getLogger(__name__)

STEAM_NEWS_RSS_TEMPLATE = "https://store.steampowered.com/feeds/news/app/{app_id}/"


@dataclass(frozen=True)
class SteamNewsTarget:
    app_id: int
    game_tag: str
    game_name: str


STEAM_NEWS_TARGETS: tuple[SteamNewsTarget, ...] = (
    SteamNewsTarget(730, "counter-strike-2", "Counter-Strike 2"),
    SteamNewsTarget(570, "dota-2", "Dota 2"),
    SteamNewsTarget(578080, "pubg", "PUBG"),
    SteamNewsTarget(1030300, "hollow-knight-silksong", "Hollow Knight: Silksong"),
)


class SteamNewsScraper:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or build_http_session()

    def fetch_all(self) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []

        for target in STEAM_NEWS_TARGETS:
            target_events = self.fetch_for_app(target)
            logger.info(
                "Steam RSS scraped %s events for %s (appId=%s)",
                len(target_events),
                target.game_name,
                target.app_id,
            )
            events.extend(target_events)

        return events

    def fetch_for_app(self, target: SteamNewsTarget) -> list[ScrapedFeedEvent]:
        feed_url = STEAM_NEWS_RSS_TEMPLATE.format(app_id=target.app_id)
        raw_xml = fetch_text(self._session, feed_url)
        if raw_xml is None:
            return []

        return self.parse_rss_xml(
            raw_xml,
            game_tag=target.game_tag,
            game_name=target.game_name,
            app_id=target.app_id,
        )

    def parse_rss_xml(
        self,
        raw_xml: str,
        *,
        game_tag: str,
        game_name: str,
        app_id: int,
    ) -> list[ScrapedFeedEvent]:
        try:
            root = ET.fromstring(raw_xml)
        except ET.ParseError as error:
            logger.warning("Steam RSS parse failed for appId=%s: %s", app_id, error)
            return []

        channel = root.find("channel")
        if channel is None:
            return []

        events: list[ScrapedFeedEvent] = []
        for index, item in enumerate(channel.findall("item")):
            if index >= settings.steam_news_max_items:
                break

            title = (item.findtext("title") or "").strip()
            raw_body = item.findtext("description") or item.findtext("contents") or ""
            plain_text = plain_text_from_html(raw_body)
            link = (item.findtext("link") or "").strip() or None
            guid = (item.findtext("guid") or link or f"{app_id}:{title}").strip()
            published_at = _parse_pub_date(item.findtext("pubDate"))

            if not title or not plain_text:
                continue

            events.append(
                ScrapedFeedEvent(
                    source=FeedSource.STEAM,
                    kind=FeedEventKind.NEWS,
                    external_id=guid,
                    game_tag=game_tag,
                    title=f"[STEAM NEWS] {game_name}: {title}",
                    plain_text=plain_text,
                    published_at=published_at,
                    source_url=link,
                )
            )

        return events


def fetch_steam_news_events(session: requests.Session | None = None) -> list[ScrapedFeedEvent]:
    return SteamNewsScraper(session=session).fetch_all()


def _parse_pub_date(raw_value: str | None) -> datetime:
    if raw_value:
        try:
            parsed = parsedate_to_datetime(raw_value)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except (TypeError, ValueError, IndexError):
            logger.debug("Could not parse Steam pubDate value: %s", raw_value)

    return datetime.now(timezone.utc)
