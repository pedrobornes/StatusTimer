"""Live audience metrics from Steam Web API and Twitch Helix."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

import requests
import time

from config.settings import settings
from scrapers.parallel_utils import run_parallel
from scrapers.status import monitored_target_scrape_tier, resolve_effective_scrape_tier
from pipeline.steam_quarantine import (
    record_steam_app_404,
    record_steam_app_success,
    should_skip_steam_app,
)
from scrapers.twitch_helix import (
    helix_get,
    parse_scrape_tier,
    prioritize_by_tier,
    prioritize_workload_targets,
    run_twitch_batched,
    twitch_guard,
)

if TYPE_CHECKING:
    from scrapers.status import MonitoredGameTarget

logger = logging.getLogger(__name__)

STEAM_PLAYERS_URL = (
    "https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/"
)
TWITCH_STREAMS_URL = "https://api.twitch.tv/helix/streams"
TWITCH_GAMES_URL = "https://api.twitch.tv/helix/games"
TWITCH_STREAMS_PAGE_SIZE = 100


def _normalize_twitch_game_name(name: str) -> str:
    return name.strip().casefold()


def _fetch_monitored_live_entry(target: "MonitoredGameTarget"):
    """Build a single live-players catalog patch (thread-safe, own session)."""
    from models.catalog_schemas import GameCatalogEntryPayload

    if target.steam_app_id is None:
        return None

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "StatusTimer-Harvester/1.0 (+live-metrics; Steam Web API)",
            "Accept": "application/json",
        }
    )

    live_players = fetch_steam_live_players(target.steam_app_id, session)
    if live_players is None:
        return None

    return GameCatalogEntryPayload(
        slug=target.slug,
        game_name=target.display_name,
        steam_app_id=target.steam_app_id,
        live_players=live_players,
    )


def _build_twitch_session(access_token: str) -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "Client-Id": settings.twitch_client_id,
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "User-Agent": "StatusTimer-Harvester/1.0 (+live-metrics; Twitch Helix)",
        }
    )
    return session


def fetch_twitch_game_ids_by_names(
    game_names: list[str],
    session: requests.Session,
) -> dict[str, str]:
    """Resolve Twitch Helix game ids keyed by exact category name."""
    if not game_names or not twitch_guard.check_available():
        return {}

    unique_names = list(dict.fromkeys(name for name in game_names if name))
    resolved: dict[str, str] = {}
    batch_size = settings.twitch_games_lookup_batch_size

    for offset in range(0, len(unique_names), batch_size):
        if not twitch_guard.check_available():
            logger.warning("Twitch circuit open — stopping /games lookup early.")
            break

        chunk = unique_names[offset : offset + batch_size]
        params: list[tuple[str, str]] = [("name", name) for name in chunk]

        response = helix_get(session, TWITCH_GAMES_URL, params=params)
        if response is None:
            continue

        try:
            payload = response.json()
        except ValueError as error:
            logger.warning("Twitch /games lookup returned invalid JSON: %s", error)
            continue

        games = payload.get("data", [])
        if not isinstance(games, list):
            continue

        for game in games:
            if not isinstance(game, dict):
                continue
            game_id = game.get("id")
            game_name = game.get("name")
            if (
                isinstance(game_id, str)
                and game_id
                and isinstance(game_name, str)
                and game_name.strip()
            ):
                resolved[_normalize_twitch_game_name(game_name)] = game_id

        if offset + batch_size < len(unique_names) and twitch_guard.check_available():
            time.sleep(settings.twitch_batch_pause_seconds)

    return resolved


def _fetch_monitored_twitch_entry(
    target: "MonitoredGameTarget",
    *,
    access_token: str,
    game_ids_by_name: dict[str, str],
) -> "GameCatalogEntryPayload | None":
    from config.twitch_game_registry import resolve_twitch_lookup_name
    from models.catalog_schemas import GameCatalogEntryPayload

    if target.skip_live_probe:
        return None

    lookup_name = resolve_twitch_lookup_name(target)
    twitch_game_id = game_ids_by_name.get(_normalize_twitch_game_name(lookup_name))
    if twitch_game_id is None:
        logger.warning(
            "No Twitch game id resolved for monitored slug=%s (lookup=%s)",
            target.slug,
            lookup_name,
        )
        return None

    session = _build_twitch_session(access_token)
    try:
        twitch_viewers = fetch_twitch_viewers(twitch_game_id, session)
    finally:
        session.close()

    if twitch_viewers is None:
        return None

    return GameCatalogEntryPayload(
        slug=target.slug,
        game_name=target.display_name,
        twitch_game_id=twitch_game_id,
        twitch_viewers=twitch_viewers,
    )


def _prioritize_monitored_twitch_targets(
    targets: list["MonitoredGameTarget"],
) -> list["MonitoredGameTarget"]:
    return prioritize_by_tier(
        targets,
        tier_getter=monitored_target_scrape_tier,
    )


def fetch_monitored_twitch_live_metrics() -> list:
    """Build Twitch viewer patches for actively monitored titles (tier-prioritized)."""
    from scrapers.status import MONITORED_GAME_TARGETS
    from scrapers.twitch_auth import get_twitch_access_token
    from config.twitch_game_registry import resolve_twitch_lookup_name

    if not settings.twitch_client_id or not settings.twitch_client_secret:
        logger.warning("Twitch credentials not configured; skipping monitored Twitch metrics.")
        return []

    active_targets = _prioritize_monitored_twitch_targets(
        [target for target in MONITORED_GAME_TARGETS if not target.skip_live_probe]
    )
    if not active_targets:
        return []

    if not twitch_guard.check_available():
        logger.warning("Twitch circuit open — skipping monitored Twitch metrics.")
        return []

    access_token = get_twitch_access_token()
    session = _build_twitch_session(access_token)
    try:
        lookup_names = [resolve_twitch_lookup_name(target) for target in active_targets]
        game_ids_by_name = fetch_twitch_game_ids_by_names(lookup_names, session)
    finally:
        session.close()

    def fetch_entry(target: "MonitoredGameTarget"):
        return _fetch_monitored_twitch_entry(
            target,
            access_token=access_token,
            game_ids_by_name=game_ids_by_name,
        )

    raw_entries = run_twitch_batched(active_targets, fetch_entry)
    entries = [entry for entry in raw_entries if entry is not None]

    logger.info(
        "Prepared %s monitored Twitch viewer patches (tier-prioritized, batched)",
        len(entries),
    )
    return entries


def fetch_steam_live_players(
    app_id: int,
    session: requests.Session | None = None,
) -> int | None:
    """Return concurrent Steam players for an app, or None when unavailable."""
    if app_id <= 0:
        return None

    if should_skip_steam_app(app_id):
        return None

    if not settings.steam_api_key:
        logger.debug("Steam API key missing; skipping live players for app %s", app_id)
        return None

    http = session or requests.Session()
    params = {"appid": app_id, "key": settings.steam_api_key}

    try:
        response = http.get(
            STEAM_PLAYERS_URL,
            params=params,
            timeout=settings.request_timeout_seconds,
        )
        if response.status_code == 404:
            record_steam_app_404(app_id)
            logger.warning("Steam live players returned 404 for app %s", app_id)
            return None

        response.raise_for_status()
        payload = response.json()
    except requests.HTTPError as error:
        if error.response is not None and error.response.status_code == 404:
            record_steam_app_404(app_id)
            logger.warning("Steam live players returned 404 for app %s", app_id)
            return None
        logger.warning("Steam live players failed for app %s: %s", app_id, error)
        return None
    except (requests.RequestException, ValueError) as error:
        logger.warning("Steam live players failed for app %s: %s", app_id, error)
        return None

    response_body = payload.get("response", {})
    if not isinstance(response_body, dict):
        return None

    if response_body.get("result") != 1:
        return None

    player_count = response_body.get("player_count")
    if player_count is None:
        return None

    record_steam_app_success(app_id)
    return max(0, int(player_count))


def fetch_twitch_viewers(
    twitch_game_id: str,
    session: requests.Session,
) -> int | None:
    """Sum live viewer counts across active Twitch streams for a game."""
    if not twitch_game_id or not twitch_guard.check_available():
        return None

    total_viewers = 0
    cursor: str | None = None

    while True:
        params: dict[str, str | int] = {
            "game_id": twitch_game_id,
            "first": TWITCH_STREAMS_PAGE_SIZE,
        }
        if cursor:
            params["after"] = cursor

        response = helix_get(session, TWITCH_STREAMS_URL, params=params)
        if response is None:
            logger.warning(
                "Twitch streams lookup failed for game_id=%s",
                twitch_game_id,
            )
            return None

        try:
            payload = response.json()
        except ValueError as error:
            logger.warning(
                "Twitch streams lookup returned invalid JSON for game_id=%s: %s",
                twitch_game_id,
                error,
            )
            return None

        streams = payload.get("data", [])
        if not isinstance(streams, list):
            return None

        for stream in streams:
            if not isinstance(stream, dict):
                continue
            viewers = stream.get("viewer_count")
            if isinstance(viewers, int):
                total_viewers += viewers

        pagination = payload.get("pagination", {})
        next_cursor = None
        if isinstance(pagination, dict):
            raw_cursor = pagination.get("cursor")
            if isinstance(raw_cursor, str) and raw_cursor:
                next_cursor = raw_cursor

        if not next_cursor:
            break

        cursor = next_cursor

    return total_viewers


def fetch_monitored_steam_live_metrics() -> list:
    """Build minimal catalog patches for monitored Steam titles."""
    from scrapers.status import MONITORED_GAME_TARGETS

    steam_targets = [
        target for target in MONITORED_GAME_TARGETS if target.steam_app_id is not None
    ]
    raw_entries = run_parallel(steam_targets, _fetch_monitored_live_entry)
    entries = [entry for entry in raw_entries if entry is not None]

    logger.info("Prepared %s monitored Steam live-player patches", len(entries))
    return entries


def fetch_scheduled_steam_metrics(targets: list[dict[str, object]]) -> list:
    """Build Steam live-player patches for scheduler-selected targets."""
    from config.game_slug_registry import get_pinned_game
    from scrapers.status import MONITORED_GAME_TARGETS, MonitoredGameTarget, ProbeStrategy

    if not targets:
        return []

    monitored_by_slug = {target.slug: target for target in MONITORED_GAME_TARGETS}
    resolved_targets: list[MonitoredGameTarget] = []

    for entry in targets:
        slug = str(entry.get("slug") or "")
        if not slug:
            continue

        known = monitored_by_slug.get(slug)
        if known is not None and known.steam_app_id is not None:
            resolved_targets.append(known)
            continue

        pinned = get_pinned_game(slug)
        if pinned is not None:
            resolved_targets.append(
                MonitoredGameTarget(
                    slug=slug,
                    display_name=str(entry.get("gameName") or slug),
                    strategy=ProbeStrategy.STEAM,
                    steam_app_id=pinned["steam_app_id"],
                    scrape_tier=resolve_effective_scrape_tier(
                        slug,
                        db_tier=parse_scrape_tier(entry.get("scrapeTier")),
                    ),
                )
            )
            continue

        steam_app_id = entry.get("steamAppId")
        if isinstance(steam_app_id, int) and steam_app_id > 0:
            resolved_targets.append(
                MonitoredGameTarget(
                    slug=slug,
                    display_name=str(entry.get("gameName") or slug),
                    strategy=ProbeStrategy.STEAM,
                    steam_app_id=steam_app_id,
                    scrape_tier=resolve_effective_scrape_tier(
                        slug,
                        db_tier=parse_scrape_tier(entry.get("scrapeTier")),
                    ),
                )
            )

    raw_entries = run_parallel(resolved_targets, _fetch_monitored_live_entry)
    entries = [entry for entry in raw_entries if entry is not None]
    logger.info("Prepared %s scheduled Steam live-player patches", len(entries))
    return entries


def fetch_scheduled_twitch_metrics(targets: list[dict[str, object]]) -> list:
    """Build Twitch viewer patches for scheduler-selected targets (tier-prioritized)."""
    from config.twitch_game_registry import resolve_twitch_lookup_name
    from scrapers.status import MONITORED_GAME_TARGETS, MonitoredGameTarget, ProbeStrategy
    from scrapers.twitch_auth import get_twitch_access_token

    if not targets:
        return []

    if not settings.twitch_client_id or not settings.twitch_client_secret:
        logger.warning("Twitch credentials not configured; skipping scheduled Twitch metrics.")
        return []

    if not twitch_guard.check_available():
        logger.warning("Twitch circuit open — skipping scheduled Twitch metrics.")
        return []

    prioritized_targets = prioritize_workload_targets(targets)
    monitored_by_slug = {target.slug: target for target in MONITORED_GAME_TARGETS}
    resolved_targets: list[MonitoredGameTarget] = []

    for entry in prioritized_targets:
        slug = str(entry.get("slug") or "")
        if not slug:
            continue

        known = monitored_by_slug.get(slug)
        if known is not None and not known.skip_live_probe:
            resolved_targets.append(known)
            continue

        game_name = str(entry.get("gameName") or slug)
        resolved_targets.append(
            MonitoredGameTarget(
                slug=slug,
                display_name=game_name,
                strategy=ProbeStrategy.STEAM,
                scrape_tier=resolve_effective_scrape_tier(
                    slug,
                    db_tier=parse_scrape_tier(entry.get("scrapeTier")),
                ),
            )
        )

    if not resolved_targets:
        return []

    access_token = get_twitch_access_token()
    session = _build_twitch_session(access_token)
    try:
        lookup_names = [resolve_twitch_lookup_name(target) for target in resolved_targets]
        game_ids_by_name = fetch_twitch_game_ids_by_names(lookup_names, session)
    finally:
        session.close()

    def fetch_entry(target: MonitoredGameTarget):
        return _fetch_monitored_twitch_entry(
            target,
            access_token=access_token,
            game_ids_by_name=game_ids_by_name,
        )

    raw_entries = run_twitch_batched(resolved_targets, fetch_entry)
    entries = [entry for entry in raw_entries if entry is not None]
    logger.info(
        "Prepared %s scheduled Twitch viewer patches (tier-prioritized, batched)",
        len(entries),
    )
    return entries
