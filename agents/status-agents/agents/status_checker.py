"""Legal status monitoring for gaming, social, and streaming platforms."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

import requests
from bs4 import BeautifulSoup

from config.settings import settings
from models.schemas import ServiceCategory, ServiceStatusResult

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MonitoredService:
    service_name: str
    category: ServiceCategory
    checker: Callable[[], bool]


class StatusChecker:
    """Checks public health endpoints and open indicators without aggressive scraping."""

    RATE_LIMIT_DELAY_SECONDS = 0.5

    def __init__(self) -> None:
        self._timeout = settings.request_timeout_seconds
        self._session = requests.Session()
        self._session.headers.update(
            {
                "User-Agent": "StatusTimer-Agent/0.1 (+local monitoring; public endpoints only)",
                "Accept": "application/json, text/html;q=0.9",
            }
        )

    def run_all_checks(self) -> list[ServiceStatusResult]:
        services = self._build_monitored_services()
        results: list[ServiceStatusResult] = []

        for index, service in enumerate(services):
            checked_at = datetime.now(timezone.utc)
            is_up = self._safe_check(service)

            results.append(
                ServiceStatusResult(
                    serviceName=service.service_name,
                    category=service.category,
                    isUp=is_up,
                    lastChecked=checked_at,
                )
            )

            if index < len(services) - 1:
                time.sleep(self.RATE_LIMIT_DELAY_SECONDS)

        return results

    def _safe_check(self, service: MonitoredService) -> bool:
        try:
            return service.checker()
        except requests.RequestException as error:
            logger.warning(
                "Check failed for %s (%s): %s",
                service.service_name,
                service.category.value,
                error,
            )
            return False
        except Exception as error:
            logger.exception(
                "Unexpected error while checking %s: %s",
                service.service_name,
                error,
            )
            return False

    def _build_monitored_services(self) -> list[MonitoredService]:
        return [
            MonitoredService(
                service_name="Discord",
                category=ServiceCategory.SOCIAL,
                checker=lambda: self._check_statuspage_summary(
                    "https://discordstatus.com/api/v2/summary.json"
                ),
            ),
            MonitoredService(
                service_name="Twitch",
                category=ServiceCategory.STREAMING,
                checker=lambda: self._check_statuspage_summary(
                    "https://status.twitch.tv/api/v2/summary.json"
                ),
            ),
            MonitoredService(
                service_name="Steam Store",
                category=ServiceCategory.GAMING,
                checker=lambda: self._check_http_connectivity(
                    "https://store.steampowered.com/"
                ),
            ),
            MonitoredService(
                service_name="Epic Games",
                category=ServiceCategory.GAMING,
                checker=lambda: self._check_statuspage_summary(
                    "https://status.epicgames.com/api/v2/summary.json"
                ),
            ),
            MonitoredService(
                service_name="Reddit",
                category=ServiceCategory.SOCIAL,
                checker=lambda: self._check_statuspage_summary(
                    "https://www.redditstatus.com/api/v2/summary.json"
                ),
            ),
        ]

    def _check_statuspage_summary(self, summary_url: str) -> bool:
        response = self._session.get(summary_url, timeout=self._timeout)
        response.raise_for_status()
        payload = response.json()
        indicator = payload.get("status", {}).get("indicator", "unknown")
        return indicator in {"none", "minor"}

    def _check_http_connectivity(self, url: str) -> bool:
        response = self._session.head(
            url,
            timeout=self._timeout,
            allow_redirects=True,
        )

        if response.status_code >= 500:
            response = self._session.get(
                url,
                timeout=self._timeout,
                allow_redirects=True,
            )

        response.raise_for_status()
        return response.status_code < 500

    def _check_public_status_page(
        self,
        page_url: str,
        healthy_keywords: tuple[str, ...],
    ) -> bool:
        response = self._session.get(page_url, timeout=self._timeout)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, "html.parser")
        page_text = " ".join(soup.stripped_strings).lower()
        return any(keyword in page_text for keyword in healthy_keywords)
