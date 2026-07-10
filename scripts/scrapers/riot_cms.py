"""Shared helpers for Riot Games CMS (Next.js + Sanity) news pages."""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

import requests

from scrapers.http_client import fetch_text
from scrapers.text_utils import markdown_from_html

logger = logging.getLogger(__name__)

_NEXT_DATA_PATTERN = re.compile(
    r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',
    re.DOTALL,
)

_SKIP_URL_SUBSTRINGS = (
    "youtube.com",
    "youtu.be",
    "merch.riotgames.com",
    "mycard.playvalorant.com",
    "discord.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "tiktok.com",
)

_RICH_TEXT_BLADE_TYPES = frozenset(
    {
        "patchNotesRichText",
        "articleRichText",
        "richText",
    }
)


def fetch_next_page(session: requests.Session, url: str) -> dict[str, Any] | None:
    """Load a Riot news page and return the embedded page object."""
    raw_html = fetch_text(session, url)
    if raw_html is None:
        return None

    match = _NEXT_DATA_PATTERN.search(raw_html)
    if not match:
        logger.warning("Riot CMS page missing __NEXT_DATA__: %s", url)
        return None

    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError as error:
        logger.warning("Riot CMS __NEXT_DATA__ parse failed for %s: %s", url, error)
        return None

    page = payload.get("props", {}).get("pageProps", {}).get("page")
    if not isinstance(page, dict):
        logger.warning("Riot CMS page object missing for %s", url)
        return None

    return page


def extract_listing_items(page: dict[str, Any]) -> list[dict[str, Any]]:
    """Return article cards from a listing page."""
    items: list[dict[str, Any]] = []
    for blade in page.get("blades", []):
        if not isinstance(blade, dict):
            continue
        if blade.get("type") != "articleCardGrid":
            continue

        raw_items = blade.get("items")
        if isinstance(raw_items, list):
            items.extend(item for item in raw_items if isinstance(item, dict))

    return items


def resolve_item_url(
    item: dict[str, Any],
    *,
    origin: str,
    allowed_hosts: frozenset[str],
) -> str | None:
    """Resolve a listing card action into a fetchable article URL."""
    action = item.get("action")
    if not isinstance(action, dict):
        return None

    action_type = str(action.get("type", "")).lower()
    if action_type == "youtube_video":
        return None

    payload = action.get("payload")
    if not isinstance(payload, dict):
        return None

    raw_url = str(payload.get("url", "")).strip()
    if not raw_url:
        return None

    lowered = raw_url.lower()
    if any(marker in lowered for marker in _SKIP_URL_SUBSTRINGS):
        return None

    absolute = urljoin(origin, raw_url)
    host = urlparse(absolute).netloc.lower()
    if host not in allowed_hosts:
        return None

    return absolute


def parse_published_at(item: dict[str, Any]) -> datetime:
    raw_value = item.get("publishedAt")
    if isinstance(raw_value, str) and raw_value.strip():
        normalized = raw_value.strip().replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(normalized)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            logger.debug("Could not parse Riot publishedAt: %s", raw_value)

    analytics = item.get("analytics")
    if isinstance(analytics, dict):
        publish_date = analytics.get("publishDate")
        if isinstance(publish_date, str) and publish_date.strip():
            normalized = publish_date.strip().replace("Z", "+00:00")
            try:
                parsed = datetime.fromisoformat(normalized)
                if parsed.tzinfo is None:
                    return parsed.replace(tzinfo=timezone.utc)
                return parsed.astimezone(timezone.utc)
            except ValueError:
                pass

    return datetime.now(timezone.utc)


def resolve_external_id(item: dict[str, Any], article_url: str) -> str:
    analytics = item.get("analytics")
    if isinstance(analytics, dict):
        content_id = analytics.get("contentId")
        if isinstance(content_id, str) and content_id.strip():
            return content_id.strip()

    return article_url


def extract_listing_description(item: dict[str, Any]) -> str:
    description = item.get("description")
    if isinstance(description, dict):
        body = description.get("body")
        if isinstance(body, str) and body.strip():
            return markdown_from_html(body)

    return ""


def extract_article_markdown(page: dict[str, Any]) -> str:
    """Extract full article body from a Riot CMS article page."""
    sections: list[str] = []

    for blade in page.get("blades", []):
        if not isinstance(blade, dict):
            continue

        blade_type = blade.get("type")
        if blade_type in _RICH_TEXT_BLADE_TYPES:
            rich_text = blade.get("richText")
            if isinstance(rich_text, dict):
                body = rich_text.get("body")
                if isinstance(body, str) and body.strip():
                    sections.append(body)

    if sections:
        return markdown_from_html("\n".join(sections))

    for blade in page.get("blades", []):
        if not isinstance(blade, dict) or blade.get("type") != "articleMasthead":
            continue

        description = blade.get("description")
        if isinstance(description, dict):
            body = description.get("body")
            if isinstance(body, str) and body.strip():
                return markdown_from_html(body)

    return ""


def prepend_hero_image(markdown: str, item: dict[str, Any], title: str) -> str:
    if "![" in markdown[:400]:
        return markdown

    media = item.get("media")
    if not isinstance(media, dict):
        media = item.get("imageMedia")

    if isinstance(media, dict):
        image_url = media.get("url")
        if isinstance(image_url, str) and image_url.strip():
            return f"![{title}]({image_url.strip()})\n\n{markdown}"

    return markdown


def build_article_markdown(
    *,
    item: dict[str, Any],
    page: dict[str, Any] | None,
    title: str,
    article_url: str,
) -> str:
    content = extract_article_markdown(page) if page is not None else ""
    if not content:
        content = extract_listing_description(item)

    if not content:
        return ""

    content = prepend_hero_image(content, item, title)
    if article_url and article_url not in content:
        content = f"{content}\n\n[Read more]({article_url})"

    return content
