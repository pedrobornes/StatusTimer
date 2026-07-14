"""Live game server telemetry harvester (multi-platform probes)."""

from __future__ import annotations

import logging
import socket
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from enum import Enum

import requests

from config.settings import settings
from models.telemetry import GameTelemetryPayload, TelemetrySource, TelemetryStatus
from scrapers.epic_lightswitch import probe_fortnite_status
from scrapers.parallel_utils import PARALLEL_HTTP_MAX_WORKERS
from scrapers.probe_models import ProbeOutcome
from scrapers.riot_telemetry import probe_riot_game_status
from scrapers.steam_probe import probe_steam_game

logger = logging.getLogger(__name__)


class ProbeStrategy(str, Enum):
    STEAM = "steam"
    RIOT = "riot"
    EPIC_LIGHTSWITCH = "epic_lightswitch"


# Star titles that must always remain Tier 1 regardless of trend calculations.
ALWAYS_TIER_1: frozenset[str] = frozenset(
    {
        "counter-strike-2",
        "dota-2",
        "valorant",
        "league-of-legends",
        "apex-legends",
        "rust",
        # GTA V canonical slug (IGDB) for consistent enrichment.
        "grand-theft-auto-v",
        "fortnite",
        "dead-by-daylight",
        "world-of-warcraft",
    }
)

# Formal scrape-tier buckets (transparent priority model).
TIER_HIGH = 1       # ALWAYS_TIER_1 + 3-day Top-20 trend promotions
TIER_MEDIUM = 2     # Current rank 1-50 (not promoted to Tier 1 yet)
TIER_LOW = 3        # Rank > 50 or unknown — strict per-cycle API cap

_DB_SCRAPE_TIERS: dict[str, int] = {}
_DB_TWITCH_RANKS: dict[str, int] = {}


def refresh_effective_scrape_tier_cache(
    db_tiers: dict[str, int] | None = None,
    twitch_ranks: dict[str, int] | None = None,
) -> None:
    global _DB_SCRAPE_TIERS, _DB_TWITCH_RANKS
    _DB_SCRAPE_TIERS = dict(db_tiers or {})
    _DB_TWITCH_RANKS = dict(twitch_ranks or {})


def resolve_effective_scrape_tier(
    slug: str,
    *,
    db_tier: int | None = None,
    current_rank: int | None = None,
) -> int:
    """
    Resolve scrape tier using the three-bucket model.

    Tier 1: ALWAYS_TIER_1 + active trend promotions (3-day Top 20).
    Tier 2: Current Twitch rank 1-50 (medium frequency).
    Tier 3: Rank > 50 or missing (low frequency, API-capped per cycle).
    """
    if slug in ALWAYS_TIER_1:
        return TIER_HIGH

    from pipeline.tier_trends import classify_scrape_tier, is_trend_promoted_tier1

    rank = current_rank
    if rank is None:
        rank = _DB_TWITCH_RANKS.get(slug)

    if rank is not None:
        return classify_scrape_tier(
            slug,
            current_rank=rank,
            trend_promoted=is_trend_promoted_tier1(slug),
        )

    if is_trend_promoted_tier1(slug):
        return TIER_HIGH

    if db_tier in {TIER_HIGH, TIER_MEDIUM, TIER_LOW}:
        return db_tier

    cached = _DB_SCRAPE_TIERS.get(slug)
    if cached in {TIER_HIGH, TIER_MEDIUM, TIER_LOW}:
        return cached

    return TIER_MEDIUM


def monitored_target_scrape_tier(target: "MonitoredGameTarget") -> int:
    return resolve_effective_scrape_tier(target.slug)


@dataclass(frozen=True)
class MonitoredGameTarget:
    slug: str
    display_name: str
    strategy: ProbeStrategy
    steam_app_id: int | None = None
    fallback_host: str | None = None
    fallback_port: int = 443
    skip_live_probe: bool = False
    scrape_tier: int = 2


def _target(
    *,
    slug: str,
    display_name: str,
    strategy: ProbeStrategy,
    steam_app_id: int | None = None,
    fallback_host: str | None = None,
    fallback_port: int = 443,
    skip_live_probe: bool = False,
) -> MonitoredGameTarget:
    """Build a monitored target; ALWAYS_TIER_1 is applied at runtime via monitored_target_scrape_tier."""
    return MonitoredGameTarget(
        slug=slug,
        display_name=display_name,
        strategy=strategy,
        steam_app_id=steam_app_id,
        fallback_host=fallback_host,
        fallback_port=fallback_port,
        skip_live_probe=skip_live_probe,
        scrape_tier=TIER_HIGH if slug in ALWAYS_TIER_1 else TIER_MEDIUM,
    )


MONITORED_GAME_TARGETS: tuple[MonitoredGameTarget, ...] = (
    _target(
        slug="counter-strike-2",
        display_name="Counter-Strike 2",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=730,
        fallback_host="162.254.196.0",
        fallback_port=27015,
    ),
    _target(
        slug="valorant",
        display_name="Valorant",
        strategy=ProbeStrategy.RIOT,
        fallback_host="valorant.com",
        fallback_port=443,
    ),
    _target(
        slug="dota-2",
        display_name="Dota 2",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=570,
        fallback_host="146.66.158.0",
        fallback_port=27015,
    ),
    _target(
        slug="pubg",
        display_name="PUBG",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=578080,
        fallback_host="52.84.31.105",
        fallback_port=443,
    ),
    _target(
        slug="fortnite",
        display_name="Fortnite",
        strategy=ProbeStrategy.EPIC_LIGHTSWITCH,
        fallback_host="epicgames.com",
        fallback_port=443,
    ),
    _target(
        slug="league-of-legends",
        display_name="League of Legends",
        strategy=ProbeStrategy.RIOT,
        fallback_host="leagueoflegends.com",
        fallback_port=443,
    ),
    _target(
        slug="teamfight-tactics",
        display_name="Teamfight Tactics",
        strategy=ProbeStrategy.RIOT,
        fallback_host="teamfighttactics.leagueoflegends.com",
        fallback_port=443,
    ),
    _target(
        slug="minecraft",
        display_name="Minecraft",
        strategy=ProbeStrategy.STEAM,
        fallback_host="minecraft.net",
        fallback_port=443,
    ),
    _target(
        slug="roblox",
        display_name="Roblox",
        strategy=ProbeStrategy.STEAM,
        fallback_host="roblox.com",
        fallback_port=443,
    ),
    _target(
        slug="apex-legends",
        display_name="Apex Legends",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=1172470,
        fallback_host="ea.com",
        fallback_port=443,
    ),
    _target(
        slug="call-of-duty",
        display_name="Call of Duty",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=1938090,
        fallback_host="callofduty.com",
        fallback_port=443,
    ),
    _target(
        slug="gta-v",
        display_name="GTA V",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=3240220,
        fallback_host="rockstargames.com",
        fallback_port=443,
    ),
    _target(
        slug="grand-theft-auto-v",
        display_name="Grand Theft Auto V",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=3240220,
        fallback_host="rockstargames.com",
        fallback_port=443,
    ),
    _target(
        slug="overwatch-2",
        display_name="Overwatch 2",
        strategy=ProbeStrategy.STEAM,
        fallback_host="overwatch.blizzard.com",
        fallback_port=443,
    ),
    _target(
        slug="overwatch",
        display_name="Overwatch 2",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=2357570,
        fallback_host="overwatch.blizzard.com",
        fallback_port=443,
    ),
    _target(
        slug="rainbow-six-siege",
        display_name="Rainbow Six Siege",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=359550,
        fallback_host="ubisoft.com",
        fallback_port=443,
    ),
    _target(
        slug="rocket-league",
        display_name="Rocket League",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=252950,
        fallback_host="psyonix.com",
        fallback_port=443,
    ),
    _target(
        slug="destiny-2",
        display_name="Destiny 2",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=1085660,
        fallback_host="bungie.net",
        fallback_port=443,
    ),
    _target(
        slug="rust",
        display_name="Rust",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=252490,
        fallback_host="facepunch.com",
        fallback_port=443,
    ),
    _target(
        slug="elden-ring",
        display_name="Elden Ring",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=1245620,
        fallback_host="bandainamcoent.eu",
        fallback_port=443,
    ),
    _target(
        slug="dead-by-daylight",
        display_name="Dead by Daylight",
        strategy=ProbeStrategy.STEAM,
        steam_app_id=381210,
        fallback_host="deadbydaylight.com",
        fallback_port=443,
    ),
    _target(
        slug="world-of-warcraft",
        display_name="World of Warcraft",
        strategy=ProbeStrategy.STEAM,
        fallback_host="worldofwarcraft.com",
        fallback_port=443,
    ),
)


class StatusHarvester:
    """Collects telemetry from structured platform APIs with graceful degradation."""

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
        workers = min(PARALLEL_HTTP_MAX_WORKERS, len(MONITORED_GAME_TARGETS))

        with ThreadPoolExecutor(max_workers=workers) as executor:
            raw_results = list(
                executor.map(self._collect_target_isolated, MONITORED_GAME_TARGETS)
            )

        results: list[GameTelemetryPayload] = []
        for target, payload in zip(MONITORED_GAME_TARGETS, raw_results, strict=True):
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

        return results

    def _collect_target_isolated(
        self,
        target: MonitoredGameTarget,
    ) -> GameTelemetryPayload | None:
        """Thread-safe probe: each worker gets its own HTTP session."""
        worker = StatusHarvester()
        return worker._collect_target(target)

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

        resolved = outcome

        return GameTelemetryPayload(
            gameSlug=target.slug,
            status=resolved.status,
            latencyMs=resolved.latency_ms,
            dataSource=resolved.data_source,
            isUpcoming=resolved.status == TelemetryStatus.UPCOMING,
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
            return probe_riot_game_status(self._session, self._timeout, target.slug)

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


def find_monitored_target(slug: str) -> MonitoredGameTarget | None:
    for target in MONITORED_GAME_TARGETS:
        if target.slug == slug:
            return target
    return None


def fetch_telemetry_for_slug(
    slug: str,
    *,
    steam_app_id: int | None = None,
    display_name: str | None = None,
) -> GameTelemetryPayload | None:
    """Collect telemetry for a single on-demand activation target."""
    target = find_monitored_target(slug)
    if target is None and steam_app_id is not None:
        target = MonitoredGameTarget(
            slug=slug,
            display_name=display_name or slug.replace("-", " ").title(),
            strategy=ProbeStrategy.STEAM,
            steam_app_id=steam_app_id,
            fallback_host="store.steampowered.com",
            fallback_port=443,
        )

    if target is None:
        logger.warning("No probe strategy available for on-demand slug=%s", slug)
        return None

    return StatusHarvester()._collect_target(target)
