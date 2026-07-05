"""Epic Games Lightswitch status probe with status-page fallback."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

from models.telemetry import TelemetrySource, TelemetryStatus
from scrapers.probe_models import ProbeOutcome

logger = logging.getLogger(__name__)

EPIC_LIGHTSWITCH_BULK_URL = (
    "https://lightswitch-public-service-prod.ol.epicgames.com/"
    "lightswitch/api/service/bulk/status"
)
EPIC_STATUS_SUMMARY_URL = "https://status.epicgames.com/api/v2/summary.json"
FORTNITE_SERVICE_ID = "Fortnite"


def probe_fortnite_status(
    session: requests.Session,
    timeout: float,
) -> ProbeOutcome | None:
    lightswitch = _query_lightswitch(session, timeout)
    if lightswitch is not None:
        return lightswitch

    logger.info("Lightswitch unavailable for Fortnite; falling back to status page.")
    return _query_status_page_summary(session, timeout)


def _query_lightswitch(
    session: requests.Session,
    timeout: float,
) -> ProbeOutcome | None:
    started = time.perf_counter()

    try:
        response = session.get(
            EPIC_LIGHTSWITCH_BULK_URL,
            params={"serviceId": FORTNITE_SERVICE_ID},
            headers={
                "Accept": "application/json",
                "User-Agent": (
                    "StatusTimer-Harvester/1.0 (+lightswitch; fortnite telemetry)"
                ),
            },
            timeout=timeout,
        )
        if response.status_code == 401:
            logger.info("Epic Lightswitch returned 401 (auth required).")
            return None

        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning("Epic Lightswitch request failed: %s", error)
        return None

    latency_ms = max(1, int((time.perf_counter() - started) * 1000))
    status_record = _extract_fortnite_status(payload)
    if status_record is None:
        return ProbeOutcome(
            status=TelemetryStatus.MAINTENANCE,
            latency_ms=latency_ms,
            data_source=TelemetrySource.STATUS_PAGE,
            context="Fortnite Lightswitch payload missing service status.",
            ambiguous=True,
        )

    normalized_status = _map_lightswitch_status(status_record)
    context = _build_lightswitch_context(status_record)
    ambiguous = normalized_status == TelemetryStatus.MAINTENANCE and bool(context)

    return ProbeOutcome(
        status=normalized_status,
        latency_ms=latency_ms,
        data_source=TelemetrySource.STATUS_PAGE,
        context=context,
        ambiguous=ambiguous,
    )


def _extract_fortnite_status(payload: Any) -> dict[str, Any] | None:
    if isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict) and item.get("serviceName") == FORTNITE_SERVICE_ID:
                return item
        return payload[0] if payload and isinstance(payload[0], dict) else None

    if isinstance(payload, dict):
        services = payload.get("services")
        if isinstance(services, list):
            for item in services:
                if isinstance(item, dict) and item.get("serviceName") == FORTNITE_SERVICE_ID:
                    return item
            if services and isinstance(services[0], dict):
                return services[0]

        if payload.get("serviceName") == FORTNITE_SERVICE_ID:
            return payload

    return None


def _map_lightswitch_status(record: dict[str, Any]) -> TelemetryStatus:
    status = str(record.get("status", "")).upper()
    if status in {"UP", "ONLINE", "OPERATIONAL"}:
        return TelemetryStatus.ONLINE
    if status in {"DOWN", "OUTAGE", "OFFLINE"}:
        return TelemetryStatus.DOWN
    if status in {"MAINTENANCE", "DEGRADED", "LIMITED"}:
        return TelemetryStatus.MAINTENANCE

    return TelemetryStatus.MAINTENANCE


def _build_lightswitch_context(record: dict[str, Any]) -> str | None:
    message = record.get("message") or record.get("status") or record.get("statusType")
    if message is None:
        return None

    normalized = str(message).strip()
    return normalized or None


def _query_status_page_summary(
    session: requests.Session,
    timeout: float,
) -> ProbeOutcome | None:
    started = time.perf_counter()

    try:
        response = session.get(EPIC_STATUS_SUMMARY_URL, timeout=timeout)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        logger.warning("Epic status summary request failed: %s", error)
        return None

    latency_ms = max(1, int((time.perf_counter() - started) * 1000))
    indicator = str(payload.get("status", {}).get("indicator", "unknown")).lower()
    description = str(payload.get("status", {}).get("description", "")).strip()

    if indicator in {"none", "minor"}:
        status = TelemetryStatus.ONLINE
    elif indicator in {"major", "critical"}:
        status = TelemetryStatus.DOWN
    else:
        status = TelemetryStatus.MAINTENANCE

    ambiguous = status != TelemetryStatus.ONLINE and bool(description)
    return ProbeOutcome(
        status=status,
        latency_ms=latency_ms,
        data_source=TelemetrySource.STATUS_PAGE,
        context=description or None,
        ambiguous=ambiguous,
    )
