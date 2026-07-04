"""Live game server telemetry harvester (Steam API + network fallback)."""

from __future__ import annotations

import logging
import socket
import time
from dataclasses import dataclass
from typing import Any

import requests

from config.settings import settings
from models.telemetry import (
    GameTelemetryPayload,
    TelemetrySource,
    TelemetryStatus,
)

logger = logging.getLogger(__name__)

STEAM_PLAYERS_URL = (
    "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/"
)


@dataclass(frozen=True)
class MonitoredGameTarget:
    slug: str
    display_name: str
    steam_app_id: int | None = None
    fallback_host: str | None = None
    fallback_port: int = 443
    status_page_url: str | None = None


MONITORED_GAME_TARGETS: tuple[MonitoredGameTarget, ...] = (
    MonitoredGameTarget(
        slug="counter-strike-2",
        display_name="Counter-Strike 2",
        steam_app_id=730,
        fallback_host="162.254.196.0",
        fallback_port=27015,
    ),
    MonitoredGameTarget(
        slug="dota-2",
        display_name="Dota 2",
        steam_app_id=570,
        fallback_host="146.66.158.0",
        fallback_port=27015,
    ),
    MonitoredGameTarget(
        slug="pubg",
        display_name="PUBG",
        steam_app_id=578080,
        fallback_host="52.84.31.105",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="gta-vi",
        display_name="GTA VI",
        steam_app_id=271590,
        fallback_host="prod.cloud.rockstargames.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="valorant",
        display_name="Valorant",
        fallback_host="104.160.131.3",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="fortnite",
        display_name="Fortnite",
        fallback_host="epicgames.com",
        fallback_port=443,
        status_page_url="https://status.epicgames.com/api/v2/summary.json",
    ),
)


class StatusHarvester:
    """Collects telemetry using Steam Web API first, then real network probes."""

    def __init__(self) -> None:
        self._timeout = settings.request_timeout_seconds
        self._session = requests.Session()
        self._session.headers.update(
            {
                "User-Agent": "StatusTimer-Harvester/1.0 (+telemetry; public APIs only)",
                "Accept": "application/json",
            }
        )

    def fetch_all(self) -> list[GameTelemetryPayload]:
        results: list[GameTelemetryPayload] = []

        for index, target in enumerate(MONITORED_GAME_TARGETS):
            payload = self._collect_target(target)
            results.append(payload)
            logger.info(
                "[%s] %s | status=%s | latency=%sms | source=%s",
                target.slug,
                target.display_name,
                payload.status.value,
                payload.latency_ms,
                payload.data_source.value,
            )

            if index < len(MONITORED_GAME_TARGETS) - 1:
                time.sleep(0.4)

        return results

    def _collect_target(self, target: MonitoredGameTarget) -> GameTelemetryPayload:
        if target.steam_app_id is not None and settings.steam_api_key:
            steam_result = self._query_steam_players(target.steam_app_id)
            if steam_result is not None:
                return GameTelemetryPayload(
                    gameSlug=target.slug,
                    status=steam_result["status"],
                    latencyMs=steam_result["latency_ms"],
                    dataSource=TelemetrySource.STEAM_API,
                )

            logger.warning(
                "Steam API unavailable for %s. Falling back to network probe.",
                target.display_name,
            )

        if target.status_page_url:
            status_page_result = self._query_status_page(target.status_page_url)
            if status_page_result is not None:
                return GameTelemetryPayload(
                    gameSlug=target.slug,
                    status=status_page_result["status"],
                    latencyMs=status_page_result["latency_ms"],
                    dataSource=TelemetrySource.STATUS_PAGE,
                )

        if target.fallback_host:
            probe = probe_tcp_latency(target.fallback_host, target.fallback_port)
            if probe is not None:
                return GameTelemetryPayload(
                    gameSlug=target.slug,
                    status=TelemetryStatus.ONLINE,
                    latencyMs=probe,
                    dataSource=TelemetrySource.NETWORK_PROBE,
                )

        return GameTelemetryPayload(
            gameSlug=target.slug,
            status=TelemetryStatus.DOWN,
            latencyMs=0,
            dataSource=TelemetrySource.NETWORK_PROBE,
        )

    def _query_steam_players(self, app_id: int) -> dict[str, Any] | None:
        started = time.perf_counter()

        try:
            response = self._session.get(
                STEAM_PLAYERS_URL,
                params={"appid": app_id, "key": settings.steam_api_key},
                timeout=self._timeout,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as error:
            logger.warning("Steam API request failed for app %s: %s", app_id, error)
            return None

        latency_ms = max(1, int((time.perf_counter() - started) * 1000))
        response_body = payload.get("response", {})
        result_code = response_body.get("result")

        if result_code != 1:
            return {
                "status": TelemetryStatus.MAINTENANCE,
                "latency_ms": latency_ms,
            }

        player_count = response_body.get("player_count", 0)
        status = TelemetryStatus.ONLINE if player_count >= 0 else TelemetryStatus.DOWN

        return {
            "status": status,
            "latency_ms": latency_ms,
        }

    def _query_status_page(self, summary_url: str) -> dict[str, Any] | None:
        started = time.perf_counter()

        try:
            response = self._session.get(summary_url, timeout=self._timeout)
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as error:
            logger.warning("Status page request failed for %s: %s", summary_url, error)
            return None

        latency_ms = max(1, int((time.perf_counter() - started) * 1000))
        indicator = payload.get("status", {}).get("indicator", "unknown")

        if indicator in {"none", "minor"}:
            status = TelemetryStatus.ONLINE
        elif indicator in {"major", "critical"}:
            status = TelemetryStatus.DOWN
        else:
            status = TelemetryStatus.MAINTENANCE

        return {
            "status": status,
            "latency_ms": latency_ms,
        }


def probe_tcp_latency(host: str, port: int, timeout: float | None = None) -> int | None:
    """Measure TCP connect latency in milliseconds."""
    connect_timeout = timeout or settings.request_timeout_seconds
    started = time.perf_counter()

    try:
        with socket.create_connection((host, port), timeout=connect_timeout):
            return max(1, int((time.perf_counter() - started) * 1000))
    except OSError as error:
        logger.debug("TCP probe failed for %s:%s (%s)", host, port, error)
        return None


def fetch_game_telemetry() -> list[GameTelemetryPayload]:
    """Entry point used by the harvester loop."""
    return StatusHarvester().fetch_all()
