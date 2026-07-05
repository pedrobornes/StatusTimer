"""Twitch OAuth client-credentials token provider with in-memory cache."""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass

import requests

from config.settings import settings

logger = logging.getLogger(__name__)

TWITCH_OAUTH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
TOKEN_REFRESH_BUFFER_SECONDS = 60


@dataclass
class _CachedToken:
    access_token: str
    expires_at: float


_token_cache: _CachedToken | None = None
_cache_lock = threading.Lock()


def clear_twitch_token_cache() -> None:
    """Reset the in-memory token cache (primarily for tests)."""
    global _token_cache

    with _cache_lock:
        _token_cache = None


def _credentials_configured() -> bool:
    return bool(settings.twitch_client_id and settings.twitch_client_secret)


def get_twitch_access_token(session: requests.Session | None = None) -> str:
    """
    Return a valid Twitch app access token using client_credentials.

    Raises:
        RuntimeError: When credentials are missing or Twitch rejects the request.
    """
    global _token_cache

    if not _credentials_configured():
        raise RuntimeError(
            "Twitch credentials are not configured. "
            "Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in scripts/.env"
        )

    with _cache_lock:
        now = time.time()
        if _token_cache is not None and now < (
            _token_cache.expires_at - TOKEN_REFRESH_BUFFER_SECONDS
        ):
            return _token_cache.access_token

    token, expires_in = _request_access_token(session)
    expires_at = time.time() + max(expires_in, TOKEN_REFRESH_BUFFER_SECONDS)

    with _cache_lock:
        _token_cache = _CachedToken(access_token=token, expires_at=expires_at)

    logger.debug("Fetched new Twitch access token (expires in %ss)", expires_in)
    return token


def _request_access_token(
    session: requests.Session | None,
) -> tuple[str, int]:
    http = session or requests.Session()
    response = http.post(
        TWITCH_OAUTH_TOKEN_URL,
        data={
            "client_id": settings.twitch_client_id,
            "client_secret": settings.twitch_client_secret,
            "grant_type": "client_credentials",
        },
        timeout=settings.request_timeout_seconds,
    )
    response.raise_for_status()

    payload = response.json()
    access_token = payload.get("access_token")
    expires_in = payload.get("expires_in")

    if not isinstance(access_token, str) or not access_token:
        raise RuntimeError("Twitch OAuth response did not include an access_token")

    if not isinstance(expires_in, int) or expires_in <= 0:
        raise RuntimeError("Twitch OAuth response did not include a valid expires_in")

    return access_token, expires_in
