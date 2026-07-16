"""Riot platform status API probes for live game telemetry."""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

import requests

from config.settings import settings
from models.telemetry import TelemetrySource, TelemetryStatus
from scrapers.probe_models import ProbeOutcome
from scrapers.text_utils import normalize_plain_text, plain_text_from_html

logger = logging.getLogger(__name__)

RIOT_API_TOKEN_HEADER = "X-Riot-Token"

RIOT_STATUS_URL_BY_SLUG: dict[str, str] = {
    "valorant": "https://na.api.riotgames.com/val/status/v1/platform-data",
    "league-of-legends": "https://na1.api.riotgames.com/lol/status/v4/platform-data",
    "teamfight-tactics": "https://na1.api.riotgames.com/tft/status/v1/platform-data",
}


def probe_riot_game_status(
    session: requests.Session,
    timeout: float,
    slug: str,
) -> ProbeOutcome | None:
    status_url = RIOT_STATUS_URL_BY_SLUG.get(slug)
    if status_url is None:
        logger.warning("No Riot status endpoint configured for slug=%s", slug)
        return None

    return probe_riot_platform_status(session, timeout, status_url)


def probe_riot_platform_status(
    session: requests.Session,
    timeout: float,
    status_url: str,
) -> ProbeOutcome | None:
    if not settings.riot_api_key:
        logger.info("Riot telemetry probe skipped: RIOT_API_KEY is not configured")
        return None

    started = time.perf_counter()

    try:
        response = session.get(
            status_url,
            headers={RIOT_API_TOKEN_HEADER: settings.riot_api_key},
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning("Riot status request failed for %s: %s", status_url, error)
        return None

    if not isinstance(payload, dict):
        return None

    latency_ms = max(1, int((time.perf_counter() - started) * 1000))
    status, context, ambiguous = _resolve_platform_status(payload)

    return ProbeOutcome(
        status=status,
        latency_ms=latency_ms,
        data_source=TelemetrySource.STATUS_PAGE,
        context=context,
        ambiguous=ambiguous,
    )


def probe_valorant_status(
    session: requests.Session,
    timeout: float,
) -> ProbeOutcome | None:
    return probe_riot_game_status(session, timeout, "valorant")


def _resolve_platform_status(
    payload: dict[str, Any],
) -> tuple[TelemetryStatus, str | None, bool]:
    incidents = _active_records(payload.get("incidents", []))
    maintenances = _active_records(payload.get("maintenances", []))

    if incidents:
        summary = _summarize_records(incidents, prefix="incident")
        return TelemetryStatus.DOWN, summary, True

    if maintenances:
        summary = _summarize_records(maintenances, prefix="maintenance")
        return TelemetryStatus.MAINTENANCE, summary, True

    return TelemetryStatus.ONLINE, None, False


def _active_records(records: Any) -> list[dict[str, Any]]:
    if not isinstance(records, list):
        return []

    active: list[dict[str, Any]] = []
    for record in records:
        if not isinstance(record, dict):
            continue

        if _is_active_riot_status_record(record):
            active.append(record)

    return active


def _is_active_riot_status_record(record: dict[str, Any]) -> bool:
    maintenance_status = str(record.get("maintenance_status", "")).strip().lower()
    if maintenance_status:
        # Riot exposes scheduled future windows separately from live downtime.
        return maintenance_status == "in_progress"

    archive_at = _parse_epoch_millis(record.get("archive_at"))
    if archive_at is not None and archive_at <= datetime.now(timezone.utc):
        return False

    legacy_status = str(record.get("status", "")).strip().lower()
    if legacy_status in {
        "closed",
        "resolved",
        "completed",
        "complete",
        "archive",
        "archived",
        "postmortem",
    }:
        return False

    return True


def _summarize_records(records: list[dict[str, Any]], *, prefix: str) -> str:
    chunks: list[str] = []
    for record in records[:2]:
        name = normalize_plain_text(str(record.get("name", f"Riot {prefix}")))
        update_text = _extract_latest_update(record)
        chunks.append(normalize_plain_text(f"{name}. {update_text}".strip()))

    return " | ".join(chunk for chunk in chunks if chunk)


def _parse_epoch_millis(raw_value: object) -> datetime | None:
    if raw_value is None:
        return None

    try:
        millis = int(raw_value)
    except (TypeError, ValueError):
        return None

    return datetime.fromtimestamp(millis / 1000, tz=timezone.utc)


def _extract_latest_update(record: dict[str, Any]) -> str:
    updates = record.get("updates", [])
    if not isinstance(updates, list) or not updates:
        return ""

    latest = updates[0]
    if not isinstance(latest, dict):
        return ""

    content = latest.get("content") or latest.get("body") or ""
    return plain_text_from_html(str(content))
