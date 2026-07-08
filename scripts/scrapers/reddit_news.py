"""Reddit subreddit RSS/Atom news scraper for games with IGDB Reddit links."""

from __future__ import annotations

import logging
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import requests

from config.settings import settings
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.news_coverage import fetch_games_with_reddit_links
from scrapers.http_client import build_http_session, fetch_text
from scrapers.text_utils import (
    clean_news_title,
    is_relevant_gaming_news,
    is_usable_news_content,
    markdown_from_html,
)

logger = logging.getLogger(__name__)

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}
REDDIT_SUBREDDIT_PATTERN = re.compile(r"reddit\.com/r/([\w_]+)", re.IGNORECASE)
REDDIT_LOW_SIGNAL_PATTERNS = (
    re.compile(r"\bcake\s*day\b", re.IGNORECASE),
    re.compile(r"\bmoderator\b", re.IGNORECASE),
    re.compile(r"\bweekly\s+(?:thread|discussion)\b", re.IGNORECASE),
)


@dataclass(frozen=True)
class RedditNewsTarget:
    subreddit: str
    game_tag: str
    game_name: str
    reddit_url: str


def parse_subreddit_from_url(url: str) -> str | None:
    match = REDDIT_SUBREDDIT_PATTERN.search(url.strip())
    if match is None:
        return None

    subreddit = match.group(1).strip()
    return subreddit or None


def build_reddit_news_targets(limit: int | None = None) -> tuple[RedditNewsTarget, ...]:
    cap = limit or settings.reddit_news_top_n
    targets: list[RedditNewsTarget] = []
    seen_subreddits: set[str] = set()

    for entry in fetch_games_with_reddit_links(limit=cap * 2):
        subreddit = parse_subreddit_from_url(entry.reddit_url)
        if subreddit is None:
            continue

        normalized = subreddit.lower()
        if normalized in seen_subreddits:
            continue

        targets.append(
            RedditNewsTarget(
                subreddit=subreddit,
                game_tag=entry.slug,
                game_name=entry.game_name,
                reddit_url=entry.reddit_url,
            )
        )
        seen_subreddits.add(normalized)

        if len(targets) >= cap:
            break

    logger.info("Resolved %s Reddit news target(s) from catalog links", len(targets))
    return tuple(targets)


class RedditNewsScraper:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or build_http_session()

    def fetch_all(
        self,
        targets: tuple[RedditNewsTarget, ...] | None = None,
    ) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []
        resolved_targets = targets if targets is not None else build_reddit_news_targets()

        for target in resolved_targets:
            target_events = self.fetch_for_subreddit(target)
            logger.info(
                "Reddit RSS scraped %s events for %s (r/%s)",
                len(target_events),
                target.game_name,
                target.subreddit,
            )
            events.extend(target_events)

        return events

    def fetch_for_subreddit(self, target: RedditNewsTarget) -> list[ScrapedFeedEvent]:
        feed_url = f"https://www.reddit.com/r/{target.subreddit}/.rss"
        raw_xml = fetch_text(self._session, feed_url)
        if raw_xml is None:
            return []

        return self.parse_feed_xml(
            raw_xml,
            game_tag=target.game_tag,
            game_name=target.game_name,
            subreddit=target.subreddit,
        )

    def parse_feed_xml(
        self,
        raw_xml: str,
        *,
        game_tag: str,
        game_name: str,
        subreddit: str,
    ) -> list[ScrapedFeedEvent]:
        try:
            root = ET.fromstring(raw_xml)
        except ET.ParseError as error:
            logger.warning("Reddit feed parse failed for r/%s: %s", subreddit, error)
            return []

        if root.tag.endswith("feed"):
            return self._parse_atom_entries(root, game_tag=game_tag, game_name=game_name)

        channel = root.find("channel")
        if channel is None:
            return []

        return self._parse_rss_items(channel, game_tag=game_tag, game_name=game_name)

    def _parse_atom_entries(
        self,
        root: ET.Element,
        *,
        game_tag: str,
        game_name: str,
    ) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []
        min_chars = settings.reddit_news_min_content_chars

        for index, entry in enumerate(root.findall("atom:entry", ATOM_NS)):
            if index >= settings.reddit_news_max_items:
                break

            raw_title = _element_text(entry.find("atom:title", ATOM_NS))
            raw_body = _element_text(entry.find("atom:content", ATOM_NS)) or _element_text(
                entry.find("atom:summary", ATOM_NS)
            )
            link = _atom_link(entry)
            external_id = _element_text(entry.find("atom:id", ATOM_NS)) or link or raw_title
            published_at = _parse_atom_updated(entry.find("atom:updated", ATOM_NS))
            title = clean_news_title(raw_title, game_name)
            formatted_content = markdown_from_html(raw_body)

            event = self._build_event_if_relevant(
                game_tag=game_tag,
                game_name=game_name,
                title=title,
                formatted_content=formatted_content,
                external_id=external_id,
                link=link,
                published_at=published_at,
                min_chars=min_chars,
            )
            if event is not None:
                events.append(event)

        return events

    def _parse_rss_items(
        self,
        channel: ET.Element,
        *,
        game_tag: str,
        game_name: str,
    ) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []
        min_chars = settings.reddit_news_min_content_chars

        for index, item in enumerate(channel.findall("item")):
            if index >= settings.reddit_news_max_items:
                break

            raw_title = (item.findtext("title") or "").strip()
            raw_body = item.findtext("description") or item.findtext("content") or ""
            link = (item.findtext("link") or "").strip() or None
            external_id = (item.findtext("guid") or link or raw_title).strip()
            published_at = _parse_pub_date(item.findtext("pubDate"))
            title = clean_news_title(raw_title, game_name)
            formatted_content = markdown_from_html(raw_body)

            event = self._build_event_if_relevant(
                game_tag=game_tag,
                game_name=game_name,
                title=title,
                formatted_content=formatted_content,
                external_id=external_id,
                link=link,
                published_at=published_at,
                min_chars=min_chars,
            )
            if event is not None:
                events.append(event)

        return events

    def _build_event_if_relevant(
        self,
        *,
        game_tag: str,
        game_name: str,
        title: str,
        formatted_content: str,
        external_id: str,
        link: str | None,
        published_at: datetime,
        min_chars: int,
    ) -> ScrapedFeedEvent | None:
        if not title or not formatted_content:
            return None

        if not is_usable_news_content(formatted_content, min_chars=min_chars):
            logger.debug(
                "Skipping thin Reddit news item for %s (%s): %s chars",
                game_name,
                title,
                len(formatted_content),
            )
            return None

        if _is_low_signal_reddit_post(title, formatted_content):
            logger.info("Skipping low-signal Reddit post for %s: %s", game_name, title)
            return None

        if not is_relevant_gaming_news(title, formatted_content):
            logger.info("Skipping non-news Reddit post for %s: %s", game_name, title)
            return None

        return ScrapedFeedEvent(
            source=FeedSource.REDDIT,
            kind=FeedEventKind.NEWS,
            external_id=external_id,
            game_tag=game_tag,
            title=title,
            plain_text=formatted_content,
            published_at=published_at,
            source_url=link,
        )


def fetch_reddit_news_events(session: requests.Session | None = None) -> list[ScrapedFeedEvent]:
    return RedditNewsScraper(session=session).fetch_all()


def _is_low_signal_reddit_post(title: str, content: str) -> bool:
    combined = f"{title}\n{content}"
    return any(pattern.search(combined) for pattern in REDDIT_LOW_SIGNAL_PATTERNS)


def _element_text(element: ET.Element | None) -> str:
    if element is None or element.text is None:
        return ""
    return element.text.strip()


def _atom_link(entry: ET.Element) -> str | None:
    for link in entry.findall("atom:link", ATOM_NS):
        href = link.attrib.get("href", "").strip()
        rel = link.attrib.get("rel", "alternate").strip().lower()
        if href and rel in {"alternate", ""}:
            return href
    return None


def _parse_atom_updated(element: ET.Element | None) -> datetime:
    raw_value = _element_text(element)
    if not raw_value:
        return datetime.now(timezone.utc)

    normalized = raw_value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        logger.debug("Could not parse Reddit atom updated value: %s", raw_value)
        return datetime.now(timezone.utc)


def _parse_pub_date(raw_value: str | None) -> datetime:
    if raw_value:
        try:
            parsed = parsedate_to_datetime(raw_value)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except (TypeError, ValueError, IndexError):
            logger.debug("Could not parse Reddit pubDate value: %s", raw_value)

    return datetime.now(timezone.utc)
