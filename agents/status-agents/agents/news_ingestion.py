"""Legal ingestion of factual gaming news from public RSS feeds."""

from __future__ import annotations

import logging
import time
import xml.etree.ElementTree as ET
from html import unescape

import requests
from bs4 import BeautifulSoup

from config.settings import settings
from models.schemas import RawNewsFact

logger = logging.getLogger(__name__)


class NewsIngester:
    """Reads public RSS feeds and extracts factual metadata only."""

    RATE_LIMIT_DELAY_SECONDS = 1.0
    MAX_SUMMARY_LENGTH = 320

    FEED_SOURCE_NAMES = {
        "pcgamer.com": "PC Gamer",
        "rockpapershotgun.com": "Rock Paper Shotgun",
        "blog.playstation.com": "PlayStation Blog",
    }

    def __init__(self) -> None:
        self._timeout = settings.request_timeout_seconds
        self._session = requests.Session()
        self._session.headers.update(
            {
                "User-Agent": "StatusTimer-Agent/0.1 (+local news ingestion; public RSS only)",
                "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
            }
        )

    def collect_recent_facts(self) -> list[RawNewsFact]:
        facts: list[RawNewsFact] = []
        max_items = settings.news_max_articles_per_run

        for index, feed_url in enumerate(settings.news_feed_urls):
            if len(facts) >= max_items:
                break

            try:
                feed_facts = self._fetch_feed_facts(feed_url)
                remaining = max_items - len(facts)
                facts.extend(feed_facts[:remaining])
            except requests.RequestException as error:
                logger.warning("Failed to fetch feed %s: %s", feed_url, error)
            except ET.ParseError as error:
                logger.warning("Failed to parse feed %s: %s", feed_url, error)

            if index < len(settings.news_feed_urls) - 1:
                time.sleep(self.RATE_LIMIT_DELAY_SECONDS)

        logger.info("Collected %s factual news inputs from RSS feeds", len(facts))
        return facts

    def _fetch_feed_facts(self, feed_url: str) -> list[RawNewsFact]:
        response = self._session.get(feed_url, timeout=self._timeout)
        response.raise_for_status()

        root = ET.fromstring(response.content)
        channel = root.find("channel")
        if channel is None:
            channel = root

        source_name = self._resolve_source_name(feed_url)
        facts: list[RawNewsFact] = []

        for item in channel.findall("item"):
            headline = self._read_text(item.find("title"))
            link = self._read_text(item.find("link"))
            published_at = self._read_text(item.find("pubDate")) or "Unknown date"
            description = self._read_text(item.find("description"))

            if not headline or not link:
                continue

            facts.append(
                RawNewsFact(
                    headline=headline,
                    source_name=source_name,
                    published_at=published_at,
                    factual_summary=self._normalize_summary(description),
                    source_url=link,
                )
            )

        return facts

    def _resolve_source_name(self, feed_url: str) -> str:
        for domain, label in self.FEED_SOURCE_NAMES.items():
            if domain in feed_url:
                return label
        return "Public Gaming Feed"

    def _read_text(self, element: ET.Element | None) -> str:
        if element is None or element.text is None:
            return ""
        return unescape(element.text).strip()

    def _normalize_summary(self, raw_text: str) -> str:
        if not raw_text:
            return "No additional factual summary provided by the feed."

        plain_text = BeautifulSoup(raw_text, "html.parser").get_text(separator=" ", strip=True)
        plain_text = " ".join(plain_text.split())

        if len(plain_text) <= self.MAX_SUMMARY_LENGTH:
            return plain_text

        return plain_text[: self.MAX_SUMMARY_LENGTH].rstrip() + "..."
