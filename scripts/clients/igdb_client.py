"""Twitch OAuth + IGDB Apicalypse v4 client."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

from config.settings import settings
from scrapers.igdb_media import (
    IGDB_GAME_FIELDS,
    MAIN_GAME_TYPE,
    IgdbGameMetadata,
    is_main_game,
    parse_igdb_game_metadata,
)

logger = logging.getLogger(__name__)

TWITCH_OAUTH_URL = "https://id.twitch.tv/oauth2/token"
IGDB_API_BASE_URL = "https://api.igdb.com/v4"
IGDB_MAX_PAGE_SIZE = 50


def is_igdb_configured() -> bool:
    return bool(settings.igdb_client_id.strip() and settings.igdb_client_secret.strip())


class IgdbClient:
    def __init__(self, session: requests.Session | None = None) -> None:
        self._session = session or requests.Session()
        self._access_token: str | None = None
        self._token_expires_at: float = 0.0

    def fetch_upcoming_games(
        self,
        *,
        limit: int | None = None,
        min_hype: int | None = None,
    ) -> list[dict[str, Any]]:
        if not is_igdb_configured():
            return []

        resolved_limit = limit or settings.igdb_releases_limit
        resolved_min_hype = min_hype if min_hype is not None else settings.igdb_min_hype
        now_unix = int(time.time())

        query = (
            f"fields {IGDB_GAME_FIELDS}; "
            f"where game_type = {MAIN_GAME_TYPE} & hypes >= {resolved_min_hype} "
            f"& (first_release_date > {now_unix} | first_release_date = null); "
            "sort hypes desc; "
            f"limit {resolved_limit};"
        )

        return self._fetch_games(query)

    def fetch_popular_right_now_games(
        self,
        *,
        limit: int,
    ) -> list[dict[str, Any]]:
        if not is_igdb_configured() or limit <= 0:
            return []

        now_unix = int(time.time())
        collected: list[dict[str, Any]] = []
        offset = 0

        while len(collected) < limit:
            page_limit = min(IGDB_MAX_PAGE_SIZE, limit - len(collected))
            query = (
                f"fields {IGDB_GAME_FIELDS}; "
                f"where game_type = {MAIN_GAME_TYPE} "
                f"& first_release_date != null "
                f"& first_release_date <= {now_unix}; "
                "sort total_rating_count desc; "
                f"limit {page_limit}; "
                f"offset {offset};"
            )
            page = self._fetch_games(query)
            if not page:
                break

            collected.extend(page)
            if len(page) < page_limit:
                break

            offset += page_limit

        return collected[:limit]

    def lookup_game_metadata_by_slug(self, slug: str) -> IgdbGameMetadata | None:
        if not is_igdb_configured():
            return None

        normalized_slug = slug.strip()
        if not normalized_slug:
            return None

        escaped_slug = normalized_slug.replace('"', '\\"')
        query = (
            f"fields {IGDB_GAME_FIELDS}; "
            f'where slug = "{escaped_slug}"; '
            "limit 1;"
        )

        rows = self._fetch_games(query)
        for row in rows:
            if not is_main_game(row):
                continue

            try:
                return parse_igdb_game_metadata(row)
            except ValueError as error:
                logger.warning(
                    "IGDB metadata parse failed for slug %s: %s",
                    normalized_slug,
                    error,
                )

        return None

    def lookup_game_metadata(self, game_name: str) -> IgdbGameMetadata | None:
        if not is_igdb_configured():
            return None

        escaped_name = game_name.replace('"', '\\"')
        query = (
            f"fields {IGDB_GAME_FIELDS}; "
            f"where game_type = {MAIN_GAME_TYPE}; "
            f'search "{escaped_name}"; '
            "limit 8;"
        )

        rows = self._fetch_games(query)
        for row in rows:
            if not is_main_game(row):
                continue

            try:
                return parse_igdb_game_metadata(row)
            except ValueError as error:
                logger.warning("IGDB metadata parse failed for %s: %s", game_name, error)

        return None

    def _fetch_games(self, query: str) -> list[dict[str, Any]]:
        payload = self._post("games", query)
        if not isinstance(payload, list):
            return []

        return [entry for entry in payload if isinstance(entry, dict)]

    def _post(self, endpoint: str, body: str) -> Any:
        token = self._ensure_access_token()
        url = f"{IGDB_API_BASE_URL}/{endpoint.lstrip('/')}"
        normalized_body = body.strip()

        logger.info("IGDB POST %s | payload=%s", endpoint, normalized_body)

        response = self._session.post(
            url,
            data=normalized_body,
            headers={
                "Client-ID": settings.igdb_client_id,
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            timeout=settings.request_timeout_seconds,
        )

        if not response.ok:
            logger.error(
                "IGDB request rejected: endpoint=%s status=%s response=%s",
                endpoint,
                response.status_code,
                response.text[:500],
            )

        response.raise_for_status()
        return response.json()

    def _ensure_access_token(self) -> str:
        if self._access_token and time.time() < self._token_expires_at:
            return self._access_token

        response = self._session.post(
            TWITCH_OAUTH_URL,
            params={
                "client_id": settings.igdb_client_id,
                "client_secret": settings.igdb_client_secret,
                "grant_type": "client_credentials",
            },
            timeout=settings.request_timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()

        token = payload.get("access_token")
        if not isinstance(token, str) or not token:
            raise ValueError("IGDB OAuth response did not include access_token")

        expires_in = payload.get("expires_in", 3600)
        ttl = int(expires_in) if isinstance(expires_in, (int, float)) else 3600
        self._access_token = token
        self._token_expires_at = time.time() + max(ttl - 120, 60)
        return token
