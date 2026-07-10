"""Official Riot Games CMS news scraper (LoL, Valorant, TFT)."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import requests

from config.settings import settings
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from scrapers.http_client import build_http_session
from scrapers.riot_cms import (
    build_article_markdown,
    extract_listing_items,
    fetch_next_page,
    parse_published_at,
    resolve_external_id,
    resolve_item_url,
)
from scrapers.text_utils import clean_news_title, is_relevant_gaming_news, is_usable_news_content

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RiotNewsTarget:
    game_tag: str
    game_name: str
    origin: str
    listing_path: str
    article_hosts: frozenset[str]


RIOT_NEWS_TARGETS: tuple[RiotNewsTarget, ...] = (
    RiotNewsTarget(
        game_tag="league-of-legends",
        game_name="League of Legends",
        origin="https://www.leagueoflegends.com",
        listing_path="/en-us/news/",
        article_hosts=frozenset(
            {
                "www.leagueoflegends.com",
                "leagueoflegends.com",
                "lolesports.com",
            }
        ),
    ),
    RiotNewsTarget(
        game_tag="valorant",
        game_name="Valorant",
        origin="https://playvalorant.com",
        listing_path="/en-us/news/",
        article_hosts=frozenset(
            {
                "playvalorant.com",
                "valorantesports.com",
                "lolesports.com",
            }
        ),
    ),
    RiotNewsTarget(
        game_tag="teamfight-tactics",
        game_name="Teamfight Tactics",
        origin="https://teamfighttactics.leagueoflegends.com",
        listing_path="/en-us/news/",
        article_hosts=frozenset(
            {
                "teamfighttactics.leagueoflegends.com",
            }
        ),
    ),
)


class RiotNewsScraper:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or build_http_session()

    def fetch_all(
        self,
        targets: tuple[RiotNewsTarget, ...] | None = None,
    ) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []
        resolved_targets = targets if targets is not None else RIOT_NEWS_TARGETS

        for target in resolved_targets:
            target_events = self.fetch_for_target(target)
            logger.info(
                "Riot news scraped %s events for %s",
                len(target_events),
                target.game_name,
            )
            events.extend(target_events)

        return events

    def fetch_for_target(self, target: RiotNewsTarget) -> list[ScrapedFeedEvent]:
        listing_url = f"{target.origin.rstrip('/')}{target.listing_path}"
        listing_page = fetch_next_page(self._session, listing_url)
        if listing_page is None:
            return []

        events: list[ScrapedFeedEvent] = []
        min_chars = settings.riot_news_min_content_chars

        for index, item in enumerate(extract_listing_items(listing_page)):
            if index >= settings.riot_news_max_items:
                break

            raw_title = str(item.get("title", "")).strip()
            if not raw_title:
                continue

            article_url = resolve_item_url(
                item,
                origin=target.origin,
                allowed_hosts=target.article_hosts,
            )
            if article_url is None:
                continue

            title = clean_news_title(raw_title, target.game_name)
            article_page = fetch_next_page(self._session, article_url)
            content = build_article_markdown(
                item=item,
                page=article_page,
                title=title,
                article_url=article_url,
            )
            if not content or not is_usable_news_content(content, min_chars=min_chars):
                logger.debug(
                    "Skipping thin Riot news for %s (%s)",
                    target.game_name,
                    title,
                )
                continue

            if not is_relevant_gaming_news(title, content):
                logger.info(
                    "Skipping low-signal Riot news for %s: %s",
                    target.game_name,
                    title,
                )
                continue

            events.append(
                ScrapedFeedEvent(
                    source=FeedSource.RIOT,
                    kind=FeedEventKind.NEWS,
                    external_id=resolve_external_id(item, article_url),
                    game_tag=target.game_tag,
                    title=title,
                    plain_text=content,
                    published_at=parse_published_at(item),
                    source_url=article_url,
                )
            )

        return events


def fetch_riot_news_events(session: requests.Session | None = None) -> list[ScrapedFeedEvent]:
    return RiotNewsScraper(session=session).fetch_all()


def resolve_riot_news_target(slug: str) -> RiotNewsTarget | None:
    for target in RIOT_NEWS_TARGETS:
        if target.game_tag == slug:
            return target
    return None
