"""Token-bucket rate limiting and circuit breaker helpers for harvester HTTP."""

from __future__ import annotations

import logging
import random
import threading
import time
from collections import defaultdict
from dataclasses import dataclass
from urllib.parse import urlparse

import requests

from config.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class DomainState:
    tokens: float
    last_refill: float
    failure_count: int = 0
    opened_at: float | None = None


class ResilientHttpClient:
    """Per-domain rate limiting, jitter, and circuit breaker."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._domains: dict[str, DomainState] = defaultdict(
            lambda: DomainState(tokens=float(settings.http_rate_limit_per_minute), last_refill=time.monotonic())
        )
        self._outage_callback = None

    def set_outage_callback(self, callback) -> None:
        self._outage_callback = callback

    def get_json(self, session: requests.Session, url: str) -> dict | list | None:
        return self._request(session, url, expect_json=True)

    def get_text(self, session: requests.Session, url: str) -> str | None:
        payload = self._request(session, url, expect_json=False)
        return payload if isinstance(payload, str) else None

    def _request(
        self,
        session: requests.Session,
        url: str,
        *,
        expect_json: bool,
    ):
        domain = urlparse(url).netloc or "unknown"

        if self._is_circuit_open(domain):
            logger.warning("Circuit open for %s — skipping %s", domain, url)
            return None

        self._acquire_token(domain)
        time.sleep(random.uniform(settings.http_jitter_min_seconds, settings.http_jitter_max_seconds))

        try:
            response = session.get(url, timeout=settings.request_timeout_seconds)
            if response.status_code in {429, 500, 502, 503, 504}:
                self._record_failure(domain)
                response.raise_for_status()

            self._record_success(domain)
            if expect_json:
                payload = response.json()
                return payload if isinstance(payload, (dict, list)) else None
            return response.text
        except requests.RequestException as error:
            self._record_failure(domain)
            logger.warning("Resilient HTTP failed for %s: %s", url, error)
            return None

    def _acquire_token(self, domain: str) -> None:
        with self._lock:
            state = self._domains[domain]
            now = time.monotonic()
            elapsed_minutes = max(0.0, (now - state.last_refill) / 60.0)
            state.tokens = min(
                float(settings.http_rate_limit_per_minute),
                state.tokens + elapsed_minutes * float(settings.http_rate_limit_per_minute),
            )
            state.last_refill = now

            while state.tokens < 1.0:
                time.sleep(0.05)
                now = time.monotonic()
                elapsed_minutes = max(0.0, (now - state.last_refill) / 60.0)
                state.tokens = min(
                    float(settings.http_rate_limit_per_minute),
                    state.tokens + elapsed_minutes * float(settings.http_rate_limit_per_minute),
                )
                state.last_refill = now

            state.tokens -= 1.0

    def _is_circuit_open(self, domain: str) -> bool:
        with self._lock:
            state = self._domains[domain]
            if state.opened_at is None:
                return False
            elapsed = time.monotonic() - state.opened_at
            if elapsed >= settings.http_circuit_open_seconds:
                state.opened_at = None
                state.failure_count = 0
                if self._outage_callback is not None:
                    self._outage_callback(domain, False)
                return False
            return True

    def _record_success(self, domain: str) -> None:
        with self._lock:
            state = self._domains[domain]
            state.failure_count = 0
            if state.opened_at is not None and self._outage_callback is not None:
                self._outage_callback(domain, False)
            state.opened_at = None

    def _record_failure(self, domain: str) -> None:
        with self._lock:
            state = self._domains[domain]
            state.failure_count += 1
            if state.failure_count >= settings.http_circuit_failure_threshold and state.opened_at is None:
                state.opened_at = time.monotonic()
                logger.error("Circuit breaker opened for domain=%s", domain)
                if self._outage_callback is not None:
                    self._outage_callback(domain, True)


resilient_http = ResilientHttpClient()
