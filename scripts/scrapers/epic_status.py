"""Epic Games public status page incident scraper."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import requests

from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from scrapers.http_client import build_http_session, fetch_json
from scrapers.text_utils import normalize_plain_text, plain_text_from_html

logger = logging.getLogger(__name__)

EPIC_INCIDENTS_URL = "https://status.epicgames.com/api/v2/incidents.json"
ACTIVE_INCIDENT_STATUSES = {
    "investigating",
    "identified",
    "monitoring",
    "postmortem",
}


class EpicStatusScraper:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or build_http_session()

    def fetch_all(self) -> list[ScrapedFeedEvent]:
        payload = fetch_json(self._session, EPIC_INCIDENTS_URL)
        if not isinstance(payload, dict):
            return []

        incidents = payload.get("incidents", [])
        if not isinstance(incidents, list):
            return []

        events: list[ScrapedFeedEvent] = []
        for incident in incidents:
            if not isinstance(incident, dict):
                continue

            parsed = self._parse_incident(incident)
            if parsed is not None:
                events.append(parsed)

        logger.info("Epic status scraped %s incident events", len(events))
        return events

    def _parse_incident(self, incident: dict) -> ScrapedFeedEvent | None:
        status = str(incident.get("status", "")).lower()
        if status not in ACTIVE_INCIDENT_STATUSES:
            return None

        incident_id = str(incident.get("id", "")).strip()
        name = normalize_plain_text(str(incident.get("name", "Epic service incident")))
        if not incident_id or not name:
            return None

        update_text = self._extract_latest_update(incident)
        plain_text = normalize_plain_text(f"{name}. {update_text}".strip())
        if not plain_text:
            return None

        published_at = _parse_iso_timestamp(
            incident.get("created_at") or incident.get("updated_at"),
        )
        game_tag = _resolve_game_tag(name, update_text)

        return ScrapedFeedEvent(
            source=FeedSource.EPIC,
            kind=FeedEventKind.INCIDENT,
            external_id=incident_id,
            game_tag=game_tag,
            title=f"[EPIC INCIDENT] {name}",
            plain_text=plain_text,
            published_at=published_at,
            source_url="https://status.epicgames.com/",
        )

    def _extract_latest_update(self, incident: dict) -> str:
        updates = incident.get("incident_updates", [])
        if not isinstance(updates, list) or not updates:
            return ""

        latest = updates[0]
        if not isinstance(latest, dict):
            return ""

        body = latest.get("body", "")
        return plain_text_from_html(str(body))


def fetch_epic_incident_events(session: requests.Session | None = None) -> list[ScrapedFeedEvent]:
    return EpicStatusScraper(session=session).fetch_all()


def _resolve_game_tag(title: str, body: str) -> str:
    haystack = f"{title} {body}".lower()
    if "fortnite" in haystack:
        return "fortnite"
    if "rocket league" in haystack:
        return "rocket-league"
    if "fall guys" in haystack:
        return "fall-guys"
    return "epic-games"


def _parse_iso_timestamp(raw_value: object) -> datetime:
    if not raw_value:
        return datetime.now(timezone.utc)

    normalized = str(raw_value).replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return datetime.now(timezone.utc)

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
