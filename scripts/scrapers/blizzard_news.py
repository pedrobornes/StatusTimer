"""Official Blizzard news scraper via the public news.blizzard.com feed API."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests

from config.settings import settings
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from scrapers.http_client import build_http_session, fetch_json, fetch_text
from scrapers.text_utils import clean_news_title, is_relevant_gaming_news, is_usable_news_content, markdown_from_html

logger = logging.getLogger(__name__)

BLIZZARD_NEWS_API_TEMPLATE = "https://news.blizzard.com/en-us/api/feed/{feed_slug}"
_BODY_END_MARKERS = ("<footer", 'id="social"', "Stay Connected", "<script")

_BLIZZARD_SLUG_ALIASES: dict[str, str] = {
    "overwatch-2": "overwatch",
    "diablo-iv": "diablo-4",
}


@dataclass(frozen=True)
class BlizzardNewsTarget:
    game_tag: str
    game_name: str
    feed_slug: str


BLIZZARD_NEWS_TARGETS: tuple[BlizzardNewsTarget, ...] = (
    BlizzardNewsTarget(
        game_tag="world-of-warcraft",
        game_name="World of Warcraft",
        feed_slug="world-of-warcraft",
    ),
    BlizzardNewsTarget(
        game_tag="diablo-4",
        game_name="Diablo IV",
        feed_slug="diablo-4",
    ),
    BlizzardNewsTarget(
        game_tag="overwatch",
        game_name="Overwatch 2",
        feed_slug="overwatch",
    ),
    BlizzardNewsTarget(
        game_tag="hearthstone",
        game_name="Hearthstone",
        feed_slug="hearthstone",
    ),
    BlizzardNewsTarget(
        game_tag="warcraft-rumble",
        game_name="Warcraft Rumble",
        feed_slug="warcraft-rumble",
    ),
)


class BlizzardNewsScraper:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or build_http_session()

    def fetch_all(
        self,
        targets: tuple[BlizzardNewsTarget, ...] | None = None,
    ) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []
        resolved_targets = targets if targets is not None else BLIZZARD_NEWS_TARGETS

        for target in resolved_targets:
            target_events = self.fetch_for_target(target)
            logger.info(
                "Blizzard news scraped %s events for %s",
                len(target_events),
                target.game_name,
            )
            events.extend(target_events)

        return events

    def fetch_for_target(self, target: BlizzardNewsTarget) -> list[ScrapedFeedEvent]:
        feed_url = BLIZZARD_NEWS_API_TEMPLATE.format(feed_slug=target.feed_slug)
        payload = fetch_json(self._session, feed_url)
        if not isinstance(payload, dict):
            logger.warning("Blizzard feed returned no JSON for %s", target.game_name)
            return []

        feed_items = _extract_feed_items(payload)
        events: list[ScrapedFeedEvent] = []
        min_chars = settings.blizzard_news_min_content_chars

        for index, item in enumerate(feed_items):
            if index >= settings.blizzard_news_max_items:
                break

            news_id = _resolve_news_id(item)
            if news_id is None:
                continue

            article_url = _resolve_article_url(item, news_id)
            article_html = fetch_text(self._session, article_url)
            if article_html is None:
                continue

            metadata = _extract_json_ld(article_html)
            fallback_title = str(item.get("title") or f"{target.game_name} update {news_id}")
            title = clean_news_title(
                str(metadata.get("headline", fallback_title)),
                target.game_name,
            )
            content = _extract_article_markdown(article_html, metadata, target.game_name)
            if not content or not is_usable_news_content(content, min_chars=min_chars):
                logger.debug(
                    "Skipping thin Blizzard news for %s (%s)",
                    target.game_name,
                    title,
                )
                continue

            if not is_relevant_gaming_news(title, content):
                logger.info(
                    "Skipping low-signal Blizzard news for %s: %s",
                    target.game_name,
                    title,
                )
                continue

            published_at = _parse_json_ld_date(metadata.get("datePublished"))
            if published_at is None:
                published_at = _parse_api_date(item.get("lastUpdated"))

            events.append(
                ScrapedFeedEvent(
                    source=FeedSource.BLIZZARD,
                    kind=FeedEventKind.NEWS,
                    external_id=f"{target.game_tag}-news-{news_id}",
                    game_tag=target.game_tag,
                    title=title,
                    plain_text=content,
                    published_at=published_at,
                    source_url=article_url,
                )
            )

        return events


def fetch_blizzard_news_events(session: requests.Session | None = None) -> list[ScrapedFeedEvent]:
    return BlizzardNewsScraper(session=session).fetch_all()


def resolve_blizzard_news_target(slug: str) -> BlizzardNewsTarget | None:
    normalized = _BLIZZARD_SLUG_ALIASES.get(slug, slug)
    for target in BLIZZARD_NEWS_TARGETS:
        if target.game_tag == normalized:
            return target
    return None


def _extract_feed_items(payload: dict[str, Any]) -> list[dict[str, Any]]:
    raw_items = payload.get("contentItems")
    if not isinstance(raw_items, list):
        return []

    normalized: list[dict[str, Any]] = []
    for entry in raw_items:
        if not isinstance(entry, dict):
            continue
        properties = entry.get("properties")
        if not isinstance(properties, dict):
            continue
        normalized.append(
            {
                "title": properties.get("title"),
                "newsId": properties.get("newsId"),
                "newsUrl": properties.get("newsUrl"),
                "lastUpdated": properties.get("lastUpdated"),
            }
        )
    return normalized


def _resolve_news_id(item: dict[str, Any]) -> str | None:
    raw_id = item.get("newsId")
    if isinstance(raw_id, int):
        return str(raw_id)
    if isinstance(raw_id, str) and raw_id.strip().isdigit():
        return raw_id.strip()
    return None


def _resolve_article_url(item: dict[str, Any], news_id: str) -> str:
    news_url = item.get("newsUrl")
    if isinstance(news_url, str) and news_url.strip():
        return news_url.strip()
    return f"https://news.blizzard.com/en-us/article/{news_id}"


def _extract_json_ld(html: str) -> dict[str, object]:
    for block in re.findall(
        r'<script type="application/ld\+json">(.*?)</script>',
        html,
        re.DOTALL,
    ):
        try:
            payload = json.loads(block)
        except json.JSONDecodeError:
            continue

        if isinstance(payload, dict) and payload.get("@type") == "NewsArticle":
            return payload

    return {}


def _extract_article_markdown(
    html: str,
    metadata: dict[str, object],
    game_name: str,
) -> str:
    start = html.find("<h2")
    if start < 0:
        return ""

    end = len(html)
    for marker in _BODY_END_MARKERS:
        marker_index = html.find(marker, start)
        if marker_index > start:
            end = min(end, marker_index)

    markdown = markdown_from_html(html[start:end]).strip()
    if not markdown:
        return ""

    images = metadata.get("image")
    image_url = None
    if isinstance(images, list) and images:
        image_url = str(images[0])
    elif isinstance(images, str):
        image_url = images

    if image_url:
        normalized = image_url.replace("https:https://", "https://")
        if "![" not in markdown[:400]:
            headline = str(metadata.get("headline", f"{game_name} news"))
            markdown = f"![{headline}]({normalized})\n\n{markdown}"

    return markdown


def _parse_json_ld_date(raw_value: object) -> datetime | None:
    if not isinstance(raw_value, str) or not raw_value.strip():
        return None

    normalized = raw_value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _parse_api_date(raw_value: object) -> datetime:
    parsed = _parse_json_ld_date(raw_value)
    if parsed is not None:
        return parsed
    return datetime.now(timezone.utc)
