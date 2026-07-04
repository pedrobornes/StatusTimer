"""Secure HTTP client for StatusTimer internal backend endpoints."""

import logging
from typing import Any

import requests

from config.settings import settings
from models.schemas import GamingNewsPayload, ServiceStatusResult

logger = logging.getLogger(__name__)


class BackendClient:
    def __init__(self) -> None:
        self._base_url = settings.backend_base_url.rstrip("/")
        self._timeout = settings.request_timeout_seconds
        self._headers = {
            "Content-Type": "application/json",
            "X-API-KEY": settings.backend_api_key,
        }

    def push_service_status(self, status: ServiceStatusResult) -> bool:
        return self._post(
            "/api/v1/internal/status",
            status.model_dump(mode="json", by_alias=True),
            "service status",
        )

    def push_gaming_news(self, news: GamingNewsPayload) -> bool:
        return self._post(
            "/api/v1/internal/news",
            news.model_dump(mode="json", by_alias=True),
            "gaming news",
        )

    def _post(self, path: str, payload: dict[str, Any], label: str) -> bool:
        url = f"{self._base_url}{path}"

        try:
            response = requests.post(
                url,
                json=payload,
                headers=self._headers,
                timeout=self._timeout,
            )
            response.raise_for_status()
            logger.info("Successfully pushed %s for %s", label, payload)
            return True
        except requests.RequestException as error:
            logger.error("Failed to push %s to %s: %s", label, url, error)
            return False
