"""Twitch Helix rate control: circuit breaker, batched requests, and tier helpers."""

from __future__ import annotations

import logging
import threading
import time
from typing import Callable, TypeVar

import requests

from config.settings import settings
from scrapers.twitch_auth import clear_twitch_token_cache

logger = logging.getLogger(__name__)

T = TypeVar("T")
R = TypeVar("R")

TWITCH_HELIX_DOMAIN = "api.twitch.tv"


class TwitchRateLimitError(Exception):
    """Raised when Twitch returns HTTP 429."""


class TwitchCircuitOpenError(Exception):
    """Raised when the Twitch circuit breaker is open."""


class TwitchAuthError(Exception):
    """Raised when Twitch Helix rejects the OAuth token (HTTP 401)."""


class TwitchHelixGuard:
    """Global circuit breaker for all Twitch Helix traffic."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._opened_at: float | None = None
        self._failure_count = 0

    def is_open(self) -> bool:
        with self._lock:
            if self._opened_at is None:
                return False

            elapsed = time.monotonic() - self._opened_at
            if elapsed >= settings.twitch_circuit_open_seconds:
                self._opened_at = None
                self._failure_count = 0
                logger.info("Twitch circuit closed after cooldown.")
                return False
            return True

    def check_available(self) -> bool:
        if self.is_open():
            logger.warning(
                "Twitch circuit open — Helix requests paused for up to %ss.",
                settings.twitch_circuit_open_seconds,
            )
            return False
        return True

    def record_rate_limit(self) -> None:
        with self._lock:
            self._opened_at = time.monotonic()
            self._failure_count = 0
            logger.error(
                "Twitch rate limit (HTTP 429) — circuit opened for %ss.",
                settings.twitch_circuit_open_seconds,
            )

    def record_success(self) -> None:
        with self._lock:
            self._failure_count = 0
            if self._opened_at is not None:
                self._opened_at = None

    def record_failure(self) -> None:
        with self._lock:
            self._failure_count += 1
            if (
                self._failure_count >= settings.twitch_circuit_failure_threshold
                and self._opened_at is None
            ):
                self._opened_at = time.monotonic()
                logger.error(
                    "Twitch Helix failures reached threshold — circuit opened for %ss.",
                    settings.twitch_circuit_open_seconds,
                )

    def reset(self) -> None:
        with self._lock:
            self._opened_at = None
            self._failure_count = 0


twitch_guard = TwitchHelixGuard()


def helix_request(
    session: requests.Session,
    method: str,
    url: str,
    *,
    params: dict | list | None = None,
) -> requests.Response | None:
    """Execute a Twitch Helix request with circuit-breaker protection."""
    if not twitch_guard.check_available():
        return None

    try:
        response = session.request(
            method,
            url,
            params=params,
            timeout=settings.request_timeout_seconds,
        )
    except requests.RequestException as error:
        twitch_guard.record_failure()
        logger.warning("Twitch Helix request failed for %s: %s", url, error)
        return None

    if response.status_code == 429:
        twitch_guard.record_rate_limit()
        return None

    if response.status_code >= 500:
        twitch_guard.record_failure()
        logger.warning(
            "Twitch Helix server error for %s: HTTP %s",
            url,
            response.status_code,
        )
        return None

    if response.status_code == 401:
        clear_twitch_token_cache()
        logger.warning(
            "Twitch Helix client error for %s: HTTP 401 (OAuth token cache cleared). "
            "Verify TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET belong to the same Twitch app.",
            url,
        )
        raise TwitchAuthError(f"Twitch Helix unauthorized for {url}")

    if response.status_code >= 400:
        logger.warning(
            "Twitch Helix client error for %s: HTTP %s",
            url,
            response.status_code,
        )
        return None

    twitch_guard.record_success()
    return response


def helix_get(
    session: requests.Session,
    url: str,
    *,
    params: dict | list | None = None,
) -> requests.Response | None:
    return helix_request(session, "GET", url, params=params)


def run_twitch_batched(
    items: list[T],
    fn: Callable[[T], R | None],
    *,
    batch_size: int | None = None,
    pause_seconds: float | None = None,
) -> list[R | None]:
    """Process Twitch-bound work in small sequential batches with pauses."""
    if not items:
        return []

    resolved_batch_size = batch_size or settings.twitch_batch_size
    resolved_pause = (
        pause_seconds
        if pause_seconds is not None
        else settings.twitch_batch_pause_seconds
    )

    results: list[R | None] = []

    for offset in range(0, len(items), resolved_batch_size):
        if not twitch_guard.check_available():
            remaining = len(items) - len(results)
            if remaining > 0:
                logger.warning(
                    "Twitch circuit open — skipping %s remaining batched item(s).",
                    remaining,
                )
                results.extend([None] * remaining)
            break

        chunk = items[offset : offset + resolved_batch_size]
        for item in chunk:
            if not twitch_guard.check_available():
                results.append(None)
                continue
            try:
                results.append(fn(item))
            except TwitchRateLimitError:
                results.append(None)

        if offset + resolved_batch_size < len(items) and twitch_guard.check_available():
            time.sleep(resolved_pause)

    while len(results) < len(items):
        results.append(None)

    return results


def parse_scrape_tier(raw_tier: object, *, default: int = 3) -> int:
    if isinstance(raw_tier, int) and raw_tier in {1, 2, 3}:
        return raw_tier
    return default


def prioritize_by_tier(
    items: list[T],
    *,
    tier_getter: Callable[[T], int],
    max_tier3: int | None = None,
) -> list[T]:
    """Sort tier 1 first, then tier 2, then capped tier 3."""
    tier_cap = max_tier3 if max_tier3 is not None else settings.twitch_metrics_max_tier3_per_cycle

    tier1 = [item for item in items if tier_getter(item) == 1]
    tier2 = [item for item in items if tier_getter(item) == 2]
    tier3 = [item for item in items if tier_getter(item) == 3]

    if tier_cap >= 0:
        tier3 = tier3[:tier_cap]

    return [*tier1, *tier2, *tier3]


def prioritize_workload_targets(targets: list[dict[str, object]]) -> list[dict[str, object]]:
    from scrapers.status import resolve_effective_scrape_tier

    return prioritize_by_tier(
        targets,
        tier_getter=lambda target: resolve_effective_scrape_tier(
            str(target.get("slug") or ""),
            db_tier=parse_scrape_tier(target.get("scrapeTier")),
        ),
    )


def should_enrich_twitch_viewers_for_rank(rank: int) -> bool:
    """Tier-1 catalog ranks always get viewer enrichment; lower ranks only if quota allows."""
    if rank <= settings.twitch_viewer_enrich_tier1_max_rank:
        return True
    if rank <= settings.twitch_viewer_enrich_tier2_max_rank:
        return twitch_guard.check_available()
    return False
