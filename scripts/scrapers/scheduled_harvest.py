"""Timestamp-driven harvest workload processing."""

from __future__ import annotations

import logging

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from models.catalog_schemas import SyncGameCatalogRequest
from models.feed_events import ScrapedFeedEvent
from models.telemetry import SyncTelemetryRequest
from pipeline.news_push import NewsPushStore, push_news_events
from scrapers.live_metrics import (
    fetch_scheduled_steam_metrics,
    fetch_scheduled_twitch_metrics,
)
from scrapers.steam_news import SteamNewsScraper, SteamNewsTarget
from scrapers.status import fetch_telemetry_for_slug

logger = logging.getLogger(__name__)


def _work_result(slug: str, work_type: str, success: bool) -> dict[str, object]:
    return {"slug": slug, "workType": work_type, "success": success}


def _as_target_list(workload: dict[str, object], key: str) -> list[dict[str, object]]:
    raw = workload.get(key)
    if not isinstance(raw, list):
        return []
    return [entry for entry in raw if isinstance(entry, dict)]


def _run_telemetry_due(
    client: BackendClient,
    targets: list[dict[str, object]],
) -> tuple[int, PushResult]:
    if not targets:
        return 0, PushResult(success=True, status_code=204)

    payloads = []
    completions: list[dict[str, object]] = []

    for target in targets:
        slug = str(target.get("slug") or "")
        if not slug:
            continue

        steam_app_id = target.get("steamAppId")
        parsed_app_id = steam_app_id if isinstance(steam_app_id, int) else None
        game_name = str(target.get("gameName") or slug)

        payload = fetch_telemetry_for_slug(
            slug,
            steam_app_id=parsed_app_id,
            display_name=game_name,
        )

        if payload is None:
            completions.append(_work_result(slug, "TELEMETRY", False))
            continue

        payloads.append(payload)
        completions.append(_work_result(slug, "TELEMETRY", True))

    sync_result = PushResult(success=True, status_code=204)
    if payloads:
        sync_result = client.sync_game_telemetry(SyncTelemetryRequest(entries=payloads))
        if not sync_result.success:
            for completion in completions:
                if completion["workType"] == "TELEMETRY" and completion["success"]:
                    completion["success"] = False

    client.complete_harvest_work(completions)
    return len(targets), sync_result


def _run_metrics_due(
    client: BackendClient,
    targets: list[dict[str, object]],
) -> tuple[int, PushResult]:
    if not targets:
        return 0, PushResult(success=True, status_code=204)

    steam_entries = fetch_scheduled_steam_metrics(targets)
    twitch_entries = fetch_scheduled_twitch_metrics(targets)
    entries = [*steam_entries, *twitch_entries]

    successes = {entry.slug for entry in entries}
    completions = [
        _work_result(
            str(target.get("slug") or ""),
            "METRICS",
            str(target.get("slug") or "") in successes,
        )
        for target in targets
        if target.get("slug")
    ]

    sync_result = PushResult(success=True, status_code=204)
    if entries:
        sync_result = client.sync_game_catalog(SyncGameCatalogRequest(entries=entries))

    client.complete_harvest_work(completions)
    return len(targets), sync_result


def _run_news_due(
    client: BackendClient,
    targets: list[dict[str, object]],
) -> tuple[int, PushResult]:
    if not targets:
        return 0, PushResult(success=True, status_code=204)

    scraper = SteamNewsScraper()
    completions: list[dict[str, object]] = []
    collected_events: list[ScrapedFeedEvent] = []
    news_store = NewsPushStore.from_settings()

    for target in targets:
        slug = str(target.get("slug") or "")
        if not slug:
            continue

        steam_app_id = target.get("steamAppId")
        if not isinstance(steam_app_id, int) or steam_app_id <= 0:
            completions.append(_work_result(slug, "NEWS", True))
            continue

        try:
            events = scraper.fetch_for_app(
                SteamNewsTarget(
                    app_id=steam_app_id,
                    game_tag=slug,
                    game_name=str(target.get("gameName") or slug),
                )
            )
            collected_events.extend(events)
            completions.append(_work_result(slug, "NEWS", True))
            logger.info("Scheduled news fetch for %s returned %s events", slug, len(events))
        except Exception:
            logger.exception("Scheduled news fetch failed for slug=%s", slug)
            completions.append(_work_result(slug, "NEWS", False))

    if collected_events:
        push_news_events(client, collected_events, news_store)

    client.complete_harvest_work(completions)
    return len(targets), PushResult(success=True, status_code=200)


def run_scheduled_harvest_workload(client: BackendClient) -> tuple[int, PushResult]:
    workload = client.fetch_harvest_workload()
    if workload is None:
        logger.info("Harvest workload endpoint unavailable; skipping scheduled work.")
        return 0, PushResult(success=True, status_code=404)

    telemetry_targets = _as_target_list(workload, "telemetryDue")
    metrics_targets = _as_target_list(workload, "metricsDue")
    news_targets = _as_target_list(workload, "newsDue")

    total_items = len(telemetry_targets) + len(metrics_targets) + len(news_targets)
    if total_items == 0:
        return 0, PushResult(success=True, status_code=204)

    logger.info(
        "Scheduled workload: telemetry=%s metrics=%s news=%s",
        len(telemetry_targets),
        len(metrics_targets),
        len(news_targets),
    )

    _, telemetry_result = _run_telemetry_due(client, telemetry_targets)
    _, metrics_result = _run_metrics_due(client, metrics_targets)
    _, news_result = _run_news_due(client, news_targets)

    aggregate_success = (
        telemetry_result.success and metrics_result.success and news_result.success
    )
    aggregate_status = (
        telemetry_result.status_code
        or metrics_result.status_code
        or news_result.status_code
        or 200
    )

    return total_items, PushResult(success=aggregate_success, status_code=aggregate_status)
