"""Enrich catalog entries with Steam Store listing metadata."""

from __future__ import annotations

import logging
from dataclasses import dataclass

import requests

from config.settings import settings
from models.catalog_schemas import GameCatalogEntryPayload

logger = logging.getLogger(__name__)

STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails"


@dataclass(frozen=True)
class SteamStoreListing:
    short_description: str | None
    price_final: int | None
    currency: str | None
    windows: bool
    mac: bool
    linux: bool
    free_to_play: bool


def fetch_steam_store_listing(
    app_id: int,
    session: requests.Session | None = None,
) -> SteamStoreListing | None:
    if app_id <= 0:
        return None

    http = session or requests.Session()
    try:
        response = http.get(
            STEAM_APP_DETAILS_URL,
            params={"appids": app_id, "cc": "us", "l": "english"},
            timeout=settings.request_timeout_seconds,
        )
        response.raise_for_status()
    except requests.RequestException:
        logger.warning("Steam store listing fetch failed for app %s", app_id)
        return None

    entry = response.json().get(str(app_id), {})
    if not entry.get("success"):
        return None

    data = entry.get("data", {})
    price_overview = data.get("price_overview") or {}
    price_final = _parse_price_cents(price_overview.get("final"))
    currency = _read_text(price_overview.get("currency"))
    free_to_play = bool(data.get("is_free")) or price_final == 0
    if price_final is None and free_to_play:
        price_final = 0

    platforms = data.get("platforms") or {}
    return SteamStoreListing(
        short_description=_read_text(data.get("short_description")),
        price_final=price_final,
        currency=currency,
        windows=bool(platforms.get("windows")),
        mac=bool(platforms.get("mac")),
        linux=bool(platforms.get("linux")),
        free_to_play=free_to_play,
    )


def enrich_catalog_entries_with_steam_store(
    entries: list[GameCatalogEntryPayload],
) -> list[GameCatalogEntryPayload]:
    if not entries:
        return entries

    enrich_limit = max(settings.steam_store_enrich_limit, 0)
    enriched: list[GameCatalogEntryPayload] = []
    session = requests.Session()

    for index, entry in enumerate(entries):
        if index >= enrich_limit or entry.steam_app_id is None:
            enriched.append(entry)
            continue

        if _has_steam_store_listing(entry):
            enriched.append(entry)
            continue

        listing = fetch_steam_store_listing(entry.steam_app_id, session=session)
        if listing is None:
            enriched.append(entry)
            continue

        enriched.append(
            entry.model_copy(
                update={
                    "steam_short_description": listing.short_description
                    or entry.steam_short_description,
                    "steam_price_final": listing.price_final
                    if listing.price_final is not None
                    else entry.steam_price_final,
                    "steam_currency": listing.currency or entry.steam_currency,
                    "steam_windows": listing.windows,
                    "steam_mac": listing.mac,
                    "steam_linux": listing.linux,
                    "steam_free_to_play": listing.free_to_play,
                }
            )
        )
        logger.info("Steam store enriched catalog entry for %s", entry.slug)

    return enriched


def _has_steam_store_listing(entry: GameCatalogEntryPayload) -> bool:
    return bool(entry.steam_short_description) or entry.steam_price_final is not None


def _parse_price_cents(value: object | None) -> int | None:
    if value is None:
        return None

    try:
        cents = int(value)
    except (TypeError, ValueError):
        return None

    return cents if cents >= 0 else None


def _read_text(value: object | None) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    return text or None
