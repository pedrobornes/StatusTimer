"""Riot Games official developer status API incident scraper."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import requests

from config.settings import settings
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from scrapers.http_client import build_http_session
from scrapers.text_utils import normalize_plain_text, plain_text_from_html

logger = logging.getLogger(__name__)

RIOT_API_TOKEN_HEADER = "X-Riot-Token"


@dataclass(frozen=True)
class RiotStatusTarget:
    status_url: str
    game_tag: str
    game_name: str


RIOT_STATUS_TARGETS: tuple[RiotStatusTarget, ...] = (
    RiotStatusTarget(
        "https://na1.api.riotgames.com/lol/status/v4/platform-data",
        "league-of-legends",
        "League of Legends",
    ),
    RiotStatusTarget(
        "https://na.api.riotgames.com/val/status/v1/platform-data",
        "valorant",
        "Valorant",
    ),
    RiotStatusTarget(
        "https://na1.api.riotgames.com/tft/status/v1/platform-data",
        "teamfight-tactics",
        "Teamfight Tactics",
    ),
    RiotStatusTarget(
        "https://americas.api.riotgames.com/lor/status/v1/platform-data",
        "legends-of-runeterra",
        "Legends of Runeterra",
    ),
)


class RiotStatusScraper:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or build_http_session()

    def fetch_all(self) -> list[ScrapedFeedEvent]:
        if not settings.riot_api_key:
            logger.info(
                "Riot status scraper skipped: RIOT_API_KEY is not configured",
            )
            return []

        events: list[ScrapedFeedEvent] = []
        headers = {RIOT_API_TOKEN_HEADER: settings.riot_api_key}

        for target in RIOT_STATUS_TARGETS:
            payload = self._fetch_platform_payload(target.status_url, headers)
            if not isinstance(payload, dict):
                continue

            target_events = self._parse_platform_payload(payload, target)
            logger.info(
                "Riot status scraped %s events for %s",
                len(target_events),
                target.game_name,
            )
            events.extend(target_events)

        return events

    def _fetch_platform_payload(
        self,
        url: str,
        headers: dict[str, str],
    ) -> dict | None:
        try:
            response = self._session.get(
                url,
                headers=headers,
                timeout=settings.request_timeout_seconds,
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict):
                return payload
        except (requests.RequestException, ValueError) as error:
            logger.warning("Riot status request failed for %s: %s", url, error)
        return None

    def _parse_platform_payload(
        self,
        payload: dict[str, Any],
        target: RiotStatusTarget,
    ) -> list[ScrapedFeedEvent]:
        events: list[ScrapedFeedEvent] = []

        for incident in payload.get("incidents", []):
            parsed = self._parse_record(
                record=incident,
                target=target,
                kind=FeedEventKind.INCIDENT,
                prefix="INCIDENT",
            )
            if parsed is not None:
                events.append(parsed)

        for maintenance in payload.get("maintenances", []):
            parsed = self._parse_record(
                record=maintenance,
                target=target,
                kind=FeedEventKind.INCIDENT,
                prefix="MAINTENANCE",
            )
            if parsed is not None:
                events.append(parsed)

        return events

    def _parse_record(
        self,
        *,
        record: Any,
        target: RiotStatusTarget,
        kind: FeedEventKind,
        prefix: str,
    ) -> ScrapedFeedEvent | None:
        if not isinstance(record, dict):
            return None

        record_id = str(record.get("id", "")).strip()
        name = normalize_plain_text(str(record.get("name", f"Riot {prefix.lower()}")))
        if not record_id or not name:
            return None

        update_text = self._extract_latest_update(record)
        plain_text = normalize_plain_text(f"{name}. {update_text}".strip())
        if not plain_text:
            return None

        published_at = _parse_epoch_millis(record.get("created_at")) or _parse_epoch_millis(
            record.get("updated_at"),
        )
        if published_at is None:
            published_at = _parse_update_timestamp(record)

        return ScrapedFeedEvent(
            source=FeedSource.RIOT,
            kind=kind,
            external_id=f"{target.game_tag}:{record_id}",
            game_tag=target.game_tag,
            title=name,
            plain_text=plain_text,
            published_at=published_at,
            source_url="https://status.riotgames.com/",
        )

    def _extract_latest_update(self, record: dict[str, Any]) -> str:
        updates = record.get("updates", [])
        if not isinstance(updates, list) or not updates:
            return ""

        latest = updates[0]
        if not isinstance(latest, dict):
            return ""

        content = latest.get("content") or latest.get("body") or ""
        return plain_text_from_html(str(content))


def fetch_riot_incident_events(session: requests.Session | None = None) -> list[ScrapedFeedEvent]:
    return RiotStatusScraper(session=session).fetch_all()


def _parse_epoch_millis(raw_value: object) -> datetime | None:
    if raw_value is None:
        return None

    try:
        millis = int(raw_value)
    except (TypeError, ValueError):
        return None

    return datetime.fromtimestamp(millis / 1000, tz=timezone.utc)


def _parse_update_timestamp(record: dict[str, Any]) -> datetime:
    updates = record.get("updates", [])
    if isinstance(updates, list) and updates:
        latest = updates[0]
        if isinstance(latest, dict):
            parsed = _parse_epoch_millis(latest.get("created_at"))
            if parsed is not None:
                return parsed

    return datetime.now(timezone.utc)
