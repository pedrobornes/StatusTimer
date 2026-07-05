"""Live game server telemetry harvester (multi-platform probes + Ollama)."""

from __future__ import annotations

import logging
import socket
import time
from dataclasses import dataclass
from enum import Enum

import requests

from config.settings import settings
from models.telemetry import GameTelemetryPayload, TelemetrySource, TelemetryStatus
from pipeline.telemetry_analyzer import TelemetryAnalyzer
from scrapers.epic_lightswitch import probe_fortnite_status
from scrapers.probe_models import ProbeOutcome
from scrapers.riot_telemetry import probe_valorant_status
from scrapers.steam_probe import probe_steam_game

logger = logging.getLogger(__name__)


class ProbeStrategy(str, Enum):
    STEAM = "steam"
    RIOT = "riot"
    EPIC_LIGHTSWITCH = "epic_lightswitch"


@dataclass(frozen=True)
class MonitoredGameTarget:
    slug: str
    display_name: str
    strategy: ProbeStrategy
    steam_app_id: int | None = None
    fallback_host: str | None = None
    fallback_port: int = 443
    skip_live_probe: bool = False


MONITORED_GAME_TARGETS: tuple[MonitoredGameTarget, ...] = (
    MonitoredGameTarget(
        slug="counter-strike-2",
        display_name="Counter-Strike 2",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=730,
        fallback_host="162.254.196.0",
        fallback_port=27015,
    ),
    MonitoredGameTarget(
        slug="valorant",
        display_name="Valorant",
        strategy=ProbeStrategy.RIOT,
        fallback_host="104.160.131.3",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="dota-2",
        display_name="Dota 2",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=570,
        fallback_host="146.66.158.0",
        fallback_port=27015,
    ),
    MonitoredGameTarget(
        slug="pubg",
        display_name="PUBG",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=578080,
        fallback_host="52.84.31.105",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="gta-vi",
        display_name="GTA VI",
        strategy=ProbeStrategy.STEAM,
        skip_live_probe=True,
    ),
    MonitoredGameTarget(
        slug="fortnite",
        display_name="Fortnite",
        strategy=ProbeStrategy.EPIC_LIGHTSWITCH,
        fallback_host="epicgames.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="league-of-legends",
        display_name="League of Legends",
        strategy=ProbeStrategy.RIOT,
        fallback_host="leagueoflegends.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="minecraft",
        display_name="Minecraft",
        strategy=ProbeStrategy.STEAM,
        fallback_host="minecraft.net",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="roblox",
        display_name="Roblox",
        strategy=ProbeStrategy.STEAM,
        fallback_host="roblox.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="apex-legends",
        display_name="Apex Legends",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=1172470,
        fallback_host="ea.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="call-of-duty",
        display_name="Call of Duty",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=1938090,
        fallback_host="callofduty.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="gta-v",
        display_name="GTA V",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=271590,
        fallback_host="rockstargames.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="overwatch-2",
        display_name="Overwatch 2",
        strategy=ProbeStrategy.STEAM,
        fallback_host="overwatch.blizzard.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="rainbow-six-siege",
        display_name="Rainbow Six Siege",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=359550,
        fallback_host="ubisoft.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="rocket-league",
        display_name="Rocket League",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=252950,
        fallback_host="psyonix.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="destiny-2",
        display_name="Destiny 2",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=1085660,
        fallback_host="bungie.net",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="rust",
        display_name="Rust",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=252490,
        fallback_host="facepunch.com",
        fallback_port=443,
    ),
    MonitoredGameTarget(
        slug="elden-ring",
        display_name="Elden Ring",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=1245620,
        fallback_host="bandainamcoent.eu",
        fallback_port=443,
    ),
)


class StatusHarvester:
    """Collects telemetry from structured platform APIs with graceful degradation."""

    def __init__(self, analyzer: TelemetryAnalyzer | None = None) -> None:
        self._timeout = settings.request_timeout_seconds
        self._analyzer = analyzer or TelemetryAnalyzer()
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
            if payload is not None:
                results.append(payload)
                logger.info(
                    "[%s] %s | status=%s | latency=%sms | source=%s",
                    target.slug,
                    target.display_name,
                    payload.status.value,
                    payload.latency_ms,
                    payload.data_source.value,
                )
            else:
                logger.warning(
                    "[%s] %s probe failed; preserving last known backend state",
                    target.slug,
                    target.display_name,
                )

            if index < len(MONITORED_GAME_TARGETS) - 1:
                time.sleep(0.35)

        return results

    def _collect_target(self, target: MonitoredGameTarget) -> GameTelemetryPayload | None:
        if target.skip_live_probe:
            logger.info(
                "Emitting UPCOMING telemetry for unreleased title %s",
                target.display_name,
            )
            return GameTelemetryPayload(
                gameSlug=target.slug,
                status=TelemetryStatus.UPCOMING,
                latencyMs=0,
                dataSource=TelemetrySource.STATUS_PAGE,
                isUpcoming=True,
            )

        outcome = self._run_primary_probe(target)
        if outcome is None:
            outcome = self._run_network_fallback(target)

        if outcome is None:
            return None

        resolved = self._analyzer.resolve_probe(
            game_name=target.display_name,
            platform=target.strategy.value,
            outcome=outcome,
        )

        return GameTelemetryPayload(
            gameSlug=target.slug,
            status=resolved.status,
            latencyMs=resolved.latency_ms,
            dataSource=resolved.data_source,
        )

    def _run_primary_probe(self, target: MonitoredGameTarget) -> ProbeOutcome | None:
        if target.strategy == ProbeStrategy.STEAM and target.steam_app_id is not None:
            return probe_steam_game(
                app_id=target.steam_app_id,
                display_name=target.display_name,
                session=self._session,
                timeout=self._timeout,
            )

        if target.strategy == ProbeStrategy.RIOT:
            return probe_valorant_status(self._session, self._timeout)

        if target.strategy == ProbeStrategy.EPIC_LIGHTSWITCH:
            return probe_fortnite_status(self._session, self._timeout)

        return None

    def _run_network_fallback(self, target: MonitoredGameTarget) -> ProbeOutcome | None:
        if not target.fallback_host:
            return None

        latency = probe_tcp_latency(target.fallback_host, target.fallback_port)
        if latency is None:
            return None

        return ProbeOutcome(
            status=TelemetryStatus.ONLINE,
            latency_ms=latency,
            data_source=TelemetrySource.NETWORK_PROBE,
            context=(
                f"Network probe succeeded for {target.fallback_host}:"
                f"{target.fallback_port} after API probe failure."
            ),
            ambiguous=False,
        )


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
