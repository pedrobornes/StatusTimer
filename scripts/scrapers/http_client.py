"""Shared HTTP session for platform feed scrapers."""

from __future__ import annotations

import logging

import requests

from config.settings import settings

logger = logging.getLogger(__name__)


def build_http_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "StatusTimer-Harvester/1.0 (+platform-feeds; public APIs only)",
            "Accept": "application/json, application/xml, text/xml, */*",
        }
    )
    return session


def fetch_text(session: requests.Session, url: str) -> str | None:
    try:
        response = session.get(url, timeout=settings.request_timeout_seconds)
        response.raise_for_status()
        return response.text
    except requests.RequestException as error:
        logger.warning("Feed request failed for %s: %s", url, error)
        return None


def fetch_json(session: requests.Session, url: str) -> dict | list | None:
    try:
        response = session.get(url, timeout=settings.request_timeout_seconds)
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, (dict, list)):
            return payload
        logger.warning("Unexpected JSON payload type from %s", url)
        return None
    except (requests.RequestException, ValueError) as error:
        logger.warning("Feed JSON request failed for %s: %s", url, error)
        return None
