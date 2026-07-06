"""Shared HTTP session for platform feed scrapers."""

from __future__ import annotations

import logging

import requests

from clients.resilient_http import resilient_http
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
    return resilient_http.get_text(session, url)


def fetch_json(session: requests.Session, url: str) -> dict | list | None:
    payload = resilient_http.get_json(session, url)
    return payload if isinstance(payload, (dict, list)) else None
