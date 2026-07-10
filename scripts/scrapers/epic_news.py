"""Official Fortnite news from fortnite.com with Epic MOTD fallback."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests

from config.settings import settings
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from scrapers.http_client import build_http_session, fetch_json
from scrapers.text_utils import (
    clean_news_title,
    is_relevant_gaming_news,
    is_usable_news_content,
    markdown_from_html,
)

logger = logging.getLogger(__name__)

FORTNITE_NEWS_LISTING_URL = "https://www.fortnite.com/news?lang=en-US"
FORTNITE_NEWS_ARTICLE_TEMPLATE = "https://www.fortnite.com/news/{slug}?lang=en-US"
FORTNITE_HOME_URL = "https://www.fortnite.com/?lang=en-US"

FORTNITE_CONTENT_API_TEMPLATE = (
    "https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/{page_slug}"
)
FORTNITE_CONTENT_PAGES: tuple[str, ...] = (
    "fortnite-game/battleroyalenews",
    "fortnite-game/battleroyalenewsv2",
    "fortnite-game/creativenews",
    "fortnite-game/savetheworldnews",
)

_NEXT_DATA_PATTERN = re.compile(
    r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',
    re.DOTALL,
)
_ARTICLE_SLUG_PATTERN = re.compile(r'href="(?:https://www\.fortnite\.com)?/news/([a-z0-9-]+)"', re.IGNORECASE)
_ARTICLE_PATH_PATTERN = re.compile(r"^/news/([a-z0-9-]+)$", re.IGNORECASE)
_OFFICIAL_ARTICLE_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

_MESSAGE_TYPES = frozenset(
    {
        "CommonUI Simple Message Base",
        "CommonUI Simple Message MOTD",
    }
)

_LOW_SIGNAL_TITLE_PHRASES = (
    "keep your account secure",
    "message of the day update",
    "how does it work",
    "what's inside",
    "whats inside",
    "co-op pve",
    "100 player pvp",
)

_BLOCKED_MARKERS = (
    "cf_challenge",
    "cloudflare",
    "please verify you are a human",
    "auth/login",
)

_BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


@dataclass(frozen=True)
class EpicNewsTarget:
    game_tag: str
    game_name: str


EPIC_NEWS_TARGETS: tuple[EpicNewsTarget, ...] = (
    EpicNewsTarget(
        game_tag="fortnite",
        game_name="Fortnite",
    ),
)


@dataclass(frozen=True)
class _ArticleCandidate:
    slug: str
    title: str
    body: str
    image_url: str | None
    published_at: datetime
    source_url: str


@dataclass(frozen=True)
class _MotdCandidate:
    title: str
    body: str
    image_url: str | None
    published_at: datetime
    message_id: str | None


class EpicNewsScraper:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or build_http_session()
        self._fortnite_session = _build_fortnite_site_session()

    def fetch_all(
        self,
        targets: tuple[EpicNewsTarget, ...] | None = None,
    ) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []
        resolved_targets = targets if targets is not None else EPIC_NEWS_TARGETS

        for target in resolved_targets:
            target_events = self.fetch_for_target(target)
            logger.info(
                "Epic news scraped %s events for %s",
                len(target_events),
                target.game_name,
            )
            events.extend(target_events)

        return events

    def fetch_for_target(self, target: EpicNewsTarget) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []
        seen_titles: set[str] = set()
        min_chars = settings.epic_news_min_content_chars

        article_candidates = _collect_fortnite_site_articles(self._fortnite_session)
        if not article_candidates:
            logger.info(
                "fortnite.com/news unavailable; using Epic MOTD fallback for %s",
                target.game_name,
            )
            article_candidates = []

        for candidate in article_candidates:
            if len(events) >= settings.epic_news_max_items:
                break

            event = _build_article_event(target, candidate, min_chars=min_chars)
            if event is None:
                continue

            dedupe_key = _normalize_title_key(event.title)
            if dedupe_key in seen_titles:
                continue
            seen_titles.add(dedupe_key)
            events.append(event)

        if not events:
            for candidate in _collect_official_motd_candidates(self._session):
                if len(events) >= settings.epic_news_max_items:
                    break

                event = _build_motd_event(target, candidate, min_chars=min_chars)
                if event is None:
                    continue

                dedupe_key = _normalize_title_key(event.title)
                if dedupe_key in seen_titles:
                    continue
                seen_titles.add(dedupe_key)
                events.append(event)

        return events


def fetch_epic_news_events(session: requests.Session | None = None) -> list[ScrapedFeedEvent]:
    return EpicNewsScraper(session=session).fetch_all()


def resolve_epic_news_target(slug: str) -> EpicNewsTarget | None:
    for target in EPIC_NEWS_TARGETS:
        if target.game_tag == slug:
            return target
    return None


def _build_fortnite_site_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(_BROWSER_HEADERS)
    return session


def _collect_fortnite_site_articles(session: requests.Session) -> list[_ArticleCandidate]:
    session.get(FORTNITE_HOME_URL, timeout=settings.request_timeout_seconds)

    listing_html = _fetch_fortnite_html(session, FORTNITE_NEWS_LISTING_URL)
    if listing_html is None:
        return []

    slugs = _extract_official_article_slugs(listing_html)
    if not slugs:
        logger.warning("fortnite.com/news listing returned no official article slugs")
        return []

    candidates: list[_ArticleCandidate] = []
    seen_slugs: set[str] = set()

    for slug in slugs:
        if len(candidates) >= settings.epic_news_max_items:
            break
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)

        article_url = FORTNITE_NEWS_ARTICLE_TEMPLATE.format(slug=slug)
        article_html = _fetch_fortnite_html(session, article_url)
        if article_html is None:
            continue

        candidate = _parse_fortnite_article(slug, article_url, article_html)
        if candidate is not None:
            candidates.append(candidate)

    return candidates


def _fetch_fortnite_html(session: requests.Session, url: str) -> str | None:
    try:
        response = session.get(url, timeout=settings.request_timeout_seconds, allow_redirects=True)
    except requests.RequestException as error:
        logger.warning("Fortnite site request failed for %s: %s", url, error)
        return None

    if response.status_code != 200:
        logger.info("Fortnite site returned HTTP %s for %s", response.status_code, url)
        return None

    html = response.text
    if _is_fortnite_blocked_page(html, response.url):
        logger.info("Fortnite site blocked automated access for %s", url)
        return None

    return html


def _is_fortnite_blocked_page(html: str, final_url: str) -> bool:
    lowered = html.lower()
    if any(marker in lowered for marker in _BLOCKED_MARKERS):
        return True
    if "/auth/login" in final_url.lower():
        return True
    if len(html) < 35_000 and "/news/" not in html and "__NEXT_DATA__" not in html:
        return True
    return False


def _extract_official_article_slugs(html: str) -> list[str]:
    ordered: list[str] = []
    seen: set[str] = set()

    next_data_slugs = _extract_slugs_from_next_data(html)
    for slug in next_data_slugs:
        if slug in seen:
            continue
        seen.add(slug)
        ordered.append(slug)

    for match in _ARTICLE_SLUG_PATTERN.finditer(html):
        slug = match.group(1).lower()
        if not _is_official_article_slug(slug):
            continue
        if slug in seen:
            continue
        seen.add(slug)
        ordered.append(slug)

    return ordered


def _extract_slugs_from_next_data(html: str) -> list[str]:
    match = _NEXT_DATA_PATTERN.search(html)
    if not match:
        return []

    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError:
        return []

    slugs: list[str] = []
    for value in _walk_json(payload):
        if not isinstance(value, str):
            continue
        path_match = _ARTICLE_PATH_PATTERN.match(value)
        if path_match is None:
            continue
        slug = path_match.group(1).lower()
        if _is_official_article_slug(slug):
            slugs.append(slug)
    return slugs


def _is_official_article_slug(slug: str) -> bool:
    normalized = slug.strip().lower()
    if not normalized or normalized == "tag":
        return False
    if normalized.startswith("tag"):
        return False
    return _OFFICIAL_ARTICLE_SLUG.fullmatch(normalized) is not None


def _parse_fortnite_article(slug: str, source_url: str, html: str) -> _ArticleCandidate | None:
    metadata = _extract_json_ld(html)
    next_payload = _extract_next_data_payload(html)

    title = _first_non_empty_str(
        metadata.get("headline"),
        _find_nested_string(next_payload, ("title", "headline", "name")),
        _meta_content(html, "og:title"),
    )
    body = _first_non_empty_str(
        metadata.get("articleBody"),
        metadata.get("description"),
        _find_nested_string(next_payload, ("body", "content", "html", "description", "summary")),
        _meta_content(html, "og:description"),
        _extract_article_body_html(html),
    )
    if not title or not body:
        return None

    image_url = _first_non_empty_str(
        _json_ld_image(metadata),
        _find_nested_string(next_payload, ("image", "imageUrl", "url")),
        _meta_content(html, "og:image"),
    )

    published_at = (
        _parse_iso_timestamp(metadata.get("datePublished"))
        or _parse_iso_timestamp(_find_nested_value(next_payload, ("publishedAt", "date", "publishDate")))
        or datetime.now(timezone.utc)
    )

    return _ArticleCandidate(
        slug=slug,
        title=title.strip(),
        body=body.strip(),
        image_url=_normalize_asset_url(image_url) if image_url else None,
        published_at=published_at,
        source_url=source_url,
    )


def _collect_official_motd_candidates(session: requests.Session) -> list[_MotdCandidate]:
    collected: list[_MotdCandidate] = []
    seen_keys: set[str] = set()

    for page_slug in FORTNITE_CONTENT_PAGES:
        page_url = FORTNITE_CONTENT_API_TEMPLATE.format(page_slug=page_slug)
        payload = fetch_json(session, page_url)
        if not isinstance(payload, dict):
            continue

        page_date = _parse_page_timestamp(payload)
        for message in _iter_message_nodes(payload):
            candidate = _motd_candidate_from_node(message, page_date)
            if candidate is None:
                continue

            dedupe_key = f"{candidate.title}|{candidate.body[:120]}"
            if dedupe_key in seen_keys:
                continue
            seen_keys.add(dedupe_key)
            collected.append(candidate)

    collected.sort(key=lambda item: item.published_at, reverse=True)
    return collected


def _build_article_event(
    target: EpicNewsTarget,
    candidate: _ArticleCandidate,
    *,
    min_chars: int,
) -> ScrapedFeedEvent | None:
    title = clean_news_title(candidate.title, target.game_name)
    content = _format_markdown(candidate.title, candidate.body, candidate.image_url)
    if not content or not is_usable_news_content(content, min_chars=min_chars):
        return None
    if not is_relevant_gaming_news(title, content):
        return None

    return ScrapedFeedEvent(
        source=FeedSource.EPIC,
        kind=FeedEventKind.NEWS,
        external_id=f"{target.game_tag}-article-{candidate.slug}",
        game_tag=target.game_tag,
        title=title,
        plain_text=content,
        published_at=candidate.published_at,
        source_url=candidate.source_url,
    )


def _build_motd_event(
    target: EpicNewsTarget,
    candidate: _MotdCandidate,
    *,
    min_chars: int,
) -> ScrapedFeedEvent | None:
    title = clean_news_title(candidate.title, target.game_name)
    if _is_low_signal_title(title):
        return None

    content = _format_markdown(candidate.title, candidate.body, candidate.image_url)
    if not content or not is_usable_news_content(content, min_chars=min_chars):
        return None
    if not is_relevant_gaming_news(title, content):
        return None

    message_id = candidate.message_id or hashlib.md5(
        f"{candidate.title}|{candidate.body}".encode("utf-8")
    ).hexdigest()[:16]

    return ScrapedFeedEvent(
        source=FeedSource.EPIC,
        kind=FeedEventKind.NEWS,
        external_id=f"{target.game_tag}-motd-{message_id}",
        game_tag=target.game_tag,
        title=title,
        plain_text=content,
        published_at=candidate.published_at,
        source_url=FORTNITE_NEWS_LISTING_URL,
    )


def _motd_candidate_from_node(
    message: dict[str, Any],
    page_date: datetime,
) -> _MotdCandidate | None:
    if message.get("hidden") is True:
        return None

    title = str(message.get("title", "")).strip()
    body = str(
        message.get("body")
        or message.get("FullScreenBody")
        or ""
    ).strip()
    if not title or not body:
        return None

    image_url = _resolve_message_image(message)
    message_id = message.get("id")
    normalized_id = str(message_id).strip() if message_id is not None else None

    return _MotdCandidate(
        title=title,
        body=body,
        image_url=image_url,
        published_at=page_date,
        message_id=normalized_id,
    )


def _iter_message_nodes(node: Any) -> list[dict[str, Any]]:
    found: list[dict[str, Any]] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            message_type = str(value.get("_type", ""))
            if message_type in _MESSAGE_TYPES and value.get("title"):
                found.append(value)
            if message_type == "CommonUI Simple Message MOTD Platform":
                nested = value.get("message")
                if isinstance(nested, dict):
                    walk(nested)
            for nested_value in value.values():
                walk(nested_value)
        elif isinstance(value, list):
            for nested_value in value:
                walk(nested_value)

    walk(node)
    return found


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
        if isinstance(payload, dict) and payload.get("@type") in {"NewsArticle", "Article", "BlogPosting"}:
            return payload
    return {}


def _extract_next_data_payload(html: str) -> dict[str, Any]:
    match = _NEXT_DATA_PATTERN.search(html)
    if not match:
        return {}

    try:
        payload = json.loads(match.group(1))
    except json.JSONDecodeError:
        return {}

    page_props = payload.get("props", {}).get("pageProps", {})
    return page_props if isinstance(page_props, dict) else {}


def _extract_article_body_html(html: str) -> str:
    for pattern in (
        r"<article[^>]*>(.*?)</article>",
        r'<div[^>]+role="article"[^>]*>(.*?)</div>',
        r"<main[^>]*>(.*?)</main>",
    ):
        match = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
        if match:
            markdown = markdown_from_html(match.group(1)).strip()
            if markdown:
                return markdown
    return ""


def _meta_content(html: str, property_name: str) -> str | None:
    pattern = rf'property="{re.escape(property_name)}" content="([^"]+)"'
    match = re.search(pattern, html, re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return None


def _json_ld_image(metadata: dict[str, object]) -> str | None:
    images = metadata.get("image")
    if isinstance(images, list) and images:
        first = images[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            url = first.get("url")
            return str(url) if isinstance(url, str) else None
    if isinstance(images, str):
        return images
    return None


def _find_nested_string(payload: dict[str, Any], keys: tuple[str, ...]) -> str | None:
    value = _find_nested_value(payload, keys)
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None


def _find_nested_value(payload: dict[str, Any], keys: tuple[str, ...]) -> object | None:
    for key in keys:
        value = payload.get(key)
        if value is not None:
            return value

    for value in payload.values():
        if isinstance(value, dict):
            nested = _find_nested_value(value, keys)
            if nested is not None:
                return nested
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    nested = _find_nested_value(item, keys)
                    if nested is not None:
                        return nested
    return None


def _walk_json(node: Any):
    if isinstance(node, dict):
        for value in node.values():
            yield from _walk_json(value)
    elif isinstance(node, list):
        for value in node:
            yield from _walk_json(value)
    else:
        yield node


def _format_markdown(title: str, body: str, image_url: str | None) -> str:
    markdown = body.strip()
    if image_url and "![" not in markdown[:400]:
        markdown = f"![{title}]({image_url})\n\n{markdown}"
    return markdown


def _normalize_title_key(title: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
    return normalized


def _is_low_signal_title(title: str) -> bool:
    lowered = title.lower()
    return any(phrase in lowered for phrase in _LOW_SIGNAL_TITLE_PHRASES)


def _parse_page_timestamp(payload: dict[str, Any]) -> datetime:
    for key in ("lastModified", "_activeDate"):
        parsed = _parse_iso_timestamp(payload.get(key))
        if parsed is not None:
            return parsed
    return datetime.now(timezone.utc)


def _parse_iso_timestamp(raw_value: object) -> datetime | None:
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


def _normalize_asset_url(url: str) -> str:
    if url.startswith("//"):
        return f"https:{url}"
    return url


def _first_non_empty_str(*values: object | None) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _resolve_message_image(message: dict[str, Any]) -> str | None:
    for key in ("image", "tileImage"):
        raw_value = message.get(key)
        if isinstance(raw_value, str) and raw_value.strip():
            return _normalize_asset_url(raw_value.strip())
    return None
