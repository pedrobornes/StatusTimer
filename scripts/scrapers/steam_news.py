"""Steam official RSS/XML news feed scraper."""

from __future__ import annotations

import logging
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import requests

from config.settings import settings
from config.twitch_game_registry import MONITORED_TWITCH_GAME_NAMES
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from models.normalization import to_slug
from scrapers.http_client import build_http_session, fetch_text
from scrapers.text_utils import (
    clean_news_title,
    is_relevant_gaming_news,
    is_usable_news_content,
    markdown_from_html,
)
from scrapers.twitch_top_games import fetch_twitch_top_games
from pipeline.news_coverage import fetch_games_without_news

logger = logging.getLogger(__name__)

STEAM_NEWS_RSS_TEMPLATE = "https://store.steampowered.com/feeds/news/app/{app_id}/"


@dataclass(frozen=True)
class SteamNewsTarget:
    app_id: int
    game_tag: str
    game_name: str


def build_steam_news_targets(limit: int | None = None) -> tuple[SteamNewsTarget, ...]:
    """Prioritize Steam RSS targets by current Twitch viewership rank."""
    from scrapers.status import MONITORED_GAME_TARGETS

    cap = limit or settings.steam_news_top_n
    monitored_by_slug = {
        target.slug: target
        for target in MONITORED_GAME_TARGETS
        if target.steam_app_id is not None
    }

    slug_aliases: dict[str, str] = {}
    for target in MONITORED_GAME_TARGETS:
        if target.steam_app_id is None:
            continue

        slug_aliases[to_slug(target.display_name)] = target.slug
        twitch_name = MONITORED_TWITCH_GAME_NAMES.get(target.slug)
        if twitch_name:
            slug_aliases[to_slug(twitch_name)] = target.slug

    targets: list[SteamNewsTarget] = []
    seen_app_ids: set[int] = set()

    uncovered_cap = min(12, cap)
    for uncovered in fetch_games_without_news(limit=uncovered_cap):
        if uncovered.steam_app_id in seen_app_ids:
            continue

        targets.append(
            SteamNewsTarget(
                app_id=uncovered.steam_app_id,
                game_tag=uncovered.slug,
                game_name=uncovered.game_name,
            )
        )
        seen_app_ids.add(uncovered.steam_app_id)

    twitch_entries = fetch_twitch_top_games(limit=max(cap * 3, 30))
    for entry in twitch_entries:
        monitored_slug = slug_aliases.get(entry.slug)
        if monitored_slug is None and entry.slug in monitored_by_slug:
            monitored_slug = entry.slug

        if monitored_slug is None:
            continue

        monitored = monitored_by_slug[monitored_slug]
        app_id = monitored.steam_app_id
        if app_id is None or app_id in seen_app_ids:
            continue

        targets.append(
            SteamNewsTarget(
                app_id=app_id,
                game_tag=monitored.slug,
                game_name=monitored.display_name,
            )
        )
        seen_app_ids.add(app_id)

        if len(targets) >= cap:
            break

    if len(targets) < cap:
        for monitored in MONITORED_GAME_TARGETS:
            app_id = monitored.steam_app_id
            if app_id is None or app_id in seen_app_ids:
                continue

            targets.append(
                SteamNewsTarget(
                    app_id=app_id,
                    game_tag=monitored.slug,
                    game_name=monitored.display_name,
                )
            )
            seen_app_ids.add(app_id)

            if len(targets) >= cap:
                break

    logger.info(
        "Resolved %s Steam news target(s) from Twitch top + monitored catalog",
        len(targets),
    )
    return tuple(targets)


class SteamNewsScraper:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or build_http_session()

    def fetch_all(self, targets: tuple[SteamNewsTarget, ...] | None = None) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []
        resolved_targets = targets if targets is not None else build_steam_news_targets()

        for target in resolved_targets:
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
        min_chars = settings.steam_news_min_content_chars

        for index, item in enumerate(channel.findall("item")):
            if index >= settings.steam_news_max_items:
                break

            raw_title = (item.findtext("title") or "").strip()
            raw_body = item.findtext("contents") or item.findtext("description") or ""
            formatted_content = markdown_from_html(raw_body)
            link = (item.findtext("link") or "").strip() or None
            guid = (item.findtext("guid") or link or f"{app_id}:{raw_title}").strip()
            published_at = _parse_pub_date(item.findtext("pubDate"))
            title = clean_news_title(raw_title, game_name)

            if not title or not formatted_content:
                continue

            if not is_usable_news_content(formatted_content, min_chars=min_chars):
                logger.debug(
                    "Skipping thin Steam news item for %s (%s): %s chars",
                    game_name,
                    title,
                    len(formatted_content),
                )
                continue

            if not is_relevant_gaming_news(title, formatted_content):
                logger.info(
                    "Skipping low-signal Steam news for %s: %s",
                    game_name,
                    title,
                )
                continue

            events.append(
                ScrapedFeedEvent(
                    source=FeedSource.STEAM,
                    kind=FeedEventKind.NEWS,
                    external_id=guid,
                    game_tag=game_tag,
                    title=title,
                    plain_text=formatted_content,
                    published_at=published_at,
                    source_url=link,
                )
            )

        return events


def fetch_steam_news_events(session: requests.Session | None = None) -> list[ScrapedFeedEvent]:
    scraper = SteamNewsScraper(session=session)
    return scraper.fetch_all()


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
