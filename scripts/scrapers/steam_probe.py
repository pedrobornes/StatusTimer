"""Steam Store API and WebAPI probes for live telemetry."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

from config.settings import settings
from models.telemetry import TelemetrySource, TelemetryStatus
from scrapers.probe_models import ProbeOutcome

logger = logging.getLogger(__name__)

STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails"
STEAM_PLAYERS_URL = (
    "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/"
)


def probe_steam_game(
    *,
    app_id: int,
    display_name: str,
    session: requests.Session,
    timeout: float,
) -> ProbeOutcome | None:
    """Probe Steam appdetails first, then player counts when an API key exists."""
    details = _query_app_details(app_id, session, timeout)
    if details is not None:
        return details

    if settings.steam_api_key:
        players = _query_player_counts(app_id, session, timeout)
        if players is not None:
            return players

    logger.warning(
        "Steam probes unavailable for %s (appId=%s)",
        display_name,
        app_id,
    )
    return None


def _query_app_details(
    app_id: int,
    session: requests.Session,
    timeout: float,
) -> ProbeOutcome | None:
    started = time.perf_counter()

    try:
        response = session.get(
            STEAM_APP_DETAILS_URL,
            params={"appids": app_id, "cc": "us", "l": "english"},
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning("Steam appdetails failed for app %s: %s", app_id, error)
        return None

    latency_ms = max(1, int((time.perf_counter() - started) * 1000))
    app_payload = payload.get(str(app_id), {})
    if not isinstance(app_payload, dict):
        return None

    if not app_payload.get("success"):
        return ProbeOutcome(
            status=TelemetryStatus.MAINTENANCE,
            latency_ms=latency_ms,
            data_source=TelemetrySource.STEAM_API,
            context=f"Steam appdetails success=false for appId={app_id}",
            ambiguous=True,
        )

    data = app_payload.get("data", {})
    if not isinstance(data, dict):
        return ProbeOutcome(
            status=TelemetryStatus.DOWN,
            latency_ms=latency_ms,
            data_source=TelemetrySource.STEAM_API,
            context=f"Steam appdetails returned empty data for appId={app_id}",
            ambiguous=True,
        )

    release_date = data.get("release_date", {})
    coming_soon = (
        isinstance(release_date, dict) and release_date.get("coming_soon") is True
    )
    if coming_soon:
        return ProbeOutcome(
            status=TelemetryStatus.MAINTENANCE,
            latency_ms=latency_ms,
            data_source=TelemetrySource.STEAM_API,
            context=(
                f"{data.get('name', 'Steam title')} is marked coming_soon "
                f"in Store API metadata."
            ),
            ambiguous=False,
        )

    return ProbeOutcome(
        status=TelemetryStatus.ONLINE,
        latency_ms=latency_ms,
        data_source=TelemetrySource.STEAM_API,
    )


def _query_player_counts(
    app_id: int,
    session: requests.Session,
    timeout: float,
) -> ProbeOutcome | None:
    started = time.perf_counter()

    try:
        response = session.get(
            STEAM_PLAYERS_URL,
            params={"appid": app_id, "key": settings.steam_api_key},
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning("Steam player API failed for app %s: %s", app_id, error)
        return None

    latency_ms = max(1, int((time.perf_counter() - started) * 1000))
    response_body = payload.get("response", {})
    if not isinstance(response_body, dict):
        return None

    result_code = response_body.get("result")
    if result_code != 1:
        return ProbeOutcome(
            status=TelemetryStatus.MAINTENANCE,
            latency_ms=latency_ms,
            data_source=TelemetrySource.STEAM_API,
            context=f"Steam player API result={result_code} for appId={app_id}",
            ambiguous=True,
        )

    player_count = response_body.get("player_count", 0)
    status = TelemetryStatus.ONLINE if int(player_count) >= 0 else TelemetryStatus.DOWN
    return ProbeOutcome(
        status=status,
        latency_ms=latency_ms,
        data_source=TelemetrySource.STEAM_API,
    )
