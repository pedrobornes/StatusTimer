"""StatusTimer automated harvesting script entry point."""

import argparse
import json
import logging
import signal
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Sequence, TypeVar

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from config.database import get_engine
from config.settings import settings
from models.catalog_schemas import GameCatalogEntryPayload, SyncGameCatalogRequest
from models.schemas import SyncGamesRequest
from models.telemetry import SyncTelemetryRequest
from pipeline.context_pipeline import ingest_events_into_context_store
from pipeline.cycle_resilience import (
    CycleDegradationTracker,
    HarvestPhaseCircuitBreaker,
    PhaseCriticality,
    generate_cycle_id,
    harvest_phase_circuit,
    resolve_phase_criticality,
)
from pipeline.deduplication import DedupStore, filter_new_events, filter_recent_events
from pipeline.news_push import NewsPushStore, push_news_events
from pipeline.skill_router import SkillRouter
from pipeline.sync_router import dispatch_skill_result
from pipeline.tier_trends import TierTrendReport, run_tier_maintenance
from scrapers.on_demand_jobs import run_on_demand_scrape_jobs
from scrapers.scheduled_harvest import run_scheduled_harvest_workload
from clients.resilient_http import resilient_http
from scrapers.platform_feeds import fetch_all_platform_feed_events
from scrapers.live_metrics import (
    fetch_monitored_steam_live_metrics,
    fetch_monitored_twitch_live_metrics,
)
from scrapers.releases import fetch_upcoming_releases
from scrapers.steam_charts import fetch_steam_charts_catalog
from scrapers.social_status import fetch_social_status_payloads
from scrapers.status import fetch_game_telemetry
from scrapers.igdb_popular_games import fetch_igdb_popular_catalog
from scrapers.twitch_top_games import fetch_twitch_top_games_catalog
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("statustimer-harvester")

_shutdown_requested = False
T = TypeVar("T")
U = TypeVar("U")

DEFAULT_BATCH_SIZE = 50


@dataclass(frozen=True)
class HarvestCycleReport:
    releases_prepared: int
    release_sync: PushResult
    catalog_prepared: int
    catalog_sync: PushResult
    twitch_catalog_prepared: int
    twitch_catalog_sync: PushResult
    telemetry_prepared: int
    telemetry_sync: PushResult
    platform_events_scraped: int
    platform_events_pushed: int
    context_chunks_indexed: int
    platform_intel_sync: PushResult
    backend_reachable: bool
    runtime_metrics: "CycleRuntimeMetrics | None" = None
    cycle_id: str = ""
    degraded: bool = False
    degradation_summary: dict[str, object] | None = None


@dataclass(frozen=True)
class DynamicCatalogBundle:
    entries: list[GameCatalogEntryPayload]
    twitch_count: int
    igdb_count: int


@dataclass(frozen=True)
class CatalogPreload:
    game_id_by_slug: dict[str, int]

    def resolve_game_id(self, slug: str) -> int | None:
        return self.game_id_by_slug.get(slug)


@dataclass
class CycleRuntimeMetrics:
    preload_duration_ms: float = 0.0
    fetch_duration_ms: float = 0.0
    normalization_duration_ms: float = 0.0
    batch_sync_duration_ms: float = 0.0
    batch_calls_total: int = 0
    batch_calls_successful: int = 0
    items_total: int = 0
    items_synced: int = 0


def _handle_shutdown(signum: int, _frame: object | None) -> None:
    global _shutdown_requested
    _shutdown_requested = True
    logger.info("Shutdown signal received (%s). Finishing current cycle...", signum)


def _log_push_result(label: str, result: PushResult) -> None:
    if result.success:
        logger.info("%s succeeded (HTTP %s)", label, result.status_code)
        return

    if result.is_endpoint_missing:
        logger.warning(
            "%s skipped: endpoint not ready (HTTP 404). Waiting for backend phase.",
            label,
        )
        return

    if result.is_backend_unreachable:
        logger.error("%s failed: backend unreachable after retries.", label)
        return

    logger.error(
        "%s failed with HTTP %s after %s attempts.",
        label,
        result.status_code,
        result.attempts,
    )


def fetch_with_retry(
    label: str,
    fetch_fn: Callable[[], T],
    *,
    max_attempts: int | None = None,
    delay_seconds: float | None = None,
) -> T:
    attempts = max_attempts or settings.request_retry_max_attempts
    delay = delay_seconds if delay_seconds is not None else settings.request_retry_delay_seconds
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            return fetch_fn()
        except Exception as error:
            last_error = error
            if attempt >= attempts:
                break
            logger.warning(
                "%s failed (attempt %s/%s): %s. Retrying in %.1fs",
                label,
                attempt,
                attempts,
                error,
                delay,
            )
            time.sleep(delay)

    raise RuntimeError(f"{label} failed after {attempts} attempts") from last_error


def run_phase_safe(
    phase_name: str,
    phase_fn: Callable[[], T],
    fallback: T,
    *,
    criticality: PhaseCriticality | None = None,
    cycle_id: str | None = None,
    degradation_tracker: CycleDegradationTracker | None = None,
    circuit_breaker: HarvestPhaseCircuitBreaker | None = None,
) -> T:
    resolved_criticality = criticality or resolve_phase_criticality(phase_name)
    cycle_label = cycle_id or "unknown"

    if circuit_breaker is not None and circuit_breaker.should_skip(phase_name):
        logger.warning(
            "cycle_id=%s phase='%s' skipped: circuit open (criticality=%s)",
            cycle_label,
            phase_name,
            resolved_criticality.value,
        )
        if degradation_tracker is not None:
            degradation_tracker.record_skip(phase_name)
        return fallback

    started_at = time.perf_counter()
    try:
        result = phase_fn()
        elapsed = (time.perf_counter() - started_at) * 1000
        if circuit_breaker is not None:
            circuit_breaker.record_success(phase_name)
        logger.info(
            "cycle_id=%s phase='%s' completed in %.1fms (criticality=%s)",
            cycle_label,
            phase_name,
            elapsed,
            resolved_criticality.value,
        )
        return result
    except Exception as error:
        elapsed = (time.perf_counter() - started_at) * 1000
        error_summary = str(error) or error.__class__.__name__
        circuit_opened = False
        if circuit_breaker is not None:
            circuit_opened = circuit_breaker.record_failure(phase_name)
        if degradation_tracker is not None:
            degradation_tracker.record_failure(
                phase_name=phase_name,
                criticality=resolved_criticality,
                error_summary=error_summary,
                duration_ms=elapsed,
            )
        logger.exception(
            "cycle_id=%s phase='%s' failed in %.1fms (criticality=%s). Continuing with fallback.",
            cycle_label,
            phase_name,
            elapsed,
            resolved_criticality.value,
        )
        if circuit_opened:
            logger.error(
                "cycle_id=%s phase='%s' circuit opened after recurring failures.",
                cycle_label,
                phase_name,
            )
        return fallback


def chunked_batch_sync(
    items: Sequence[T],
    *,
    sync_fn: Callable[[T], U],
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> list[U]:
    if batch_size <= 0:
        raise ValueError("batch_size must be positive")
    results: list[U] = []
    for offset in range(0, len(items), batch_size):
        chunk = items[offset : offset + batch_size]
        for item in chunk:
            results.append(sync_fn(item))
    return results


def preload_catalog_snapshot() -> CatalogPreload:
    query = text("SELECT id, slug FROM games")
    game_id_by_slug: dict[str, int] = {}
    try:
        with get_engine().connect() as connection:
            rows = connection.execute(query).all()
    except SQLAlchemyError:
        logger.exception("Catalog preload failed. Continuing with empty snapshot.")
        return CatalogPreload(game_id_by_slug={})

    for row in rows:
        game_id = row[0]
        slug = row[1]
        if isinstance(game_id, int) and isinstance(slug, str) and slug:
            game_id_by_slug[slug] = game_id

    logger.info("Catalog preload ready: %s slug->game_id mappings", len(game_id_by_slug))
    return CatalogPreload(game_id_by_slug=game_id_by_slug)


def _push_batches_with_fallback(
    *,
    items: Sequence[T],
    batch_size: int,
    push_batch: Callable[[Sequence[T]], PushResult],
    label: str,
    runtime_metrics: CycleRuntimeMetrics | None = None,
) -> tuple[int, list[PushResult]]:
    if not items:
        return 0, []

    results: list[PushResult] = []
    successful_items = 0

    def _push_chunk(chunk: Sequence[T]) -> None:
        nonlocal successful_items
        started_at = time.perf_counter()
        result = push_batch(chunk)
        elapsed_ms = (time.perf_counter() - started_at) * 1000
        results.append(result)
        _log_push_result(label, result)
        if runtime_metrics is not None:
            runtime_metrics.batch_sync_duration_ms += elapsed_ms
            runtime_metrics.batch_calls_total += 1
            if result.success:
                runtime_metrics.batch_calls_successful += 1

        if result.success:
            successful_items += len(chunk)
            return

        if len(chunk) <= 1:
            return

        midpoint = len(chunk) // 2
        logger.warning(
            "%s batch failed for %s item(s). Splitting into %s + %s.",
            label,
            len(chunk),
            midpoint,
            len(chunk) - midpoint,
        )
        _push_chunk(chunk[:midpoint])
        _push_chunk(chunk[midpoint:])

    for offset in range(0, len(items), batch_size):
        _push_chunk(items[offset : offset + batch_size])

    return successful_items, results


def _aggregate_results(
    *,
    results: Sequence[PushResult],
    successful_items: int,
    total_items: int,
    empty_status: int,
    empty_error: str,
) -> PushResult:
    if not results:
        return PushResult(success=True, status_code=empty_status)

    last = results[-1]
    return PushResult(
        success=successful_items == total_items,
        status_code=last.status_code,
        attempts=last.attempts,
        error_message=(
            None
            if successful_items == total_items
            else (last.error_message or empty_error)
        ),
    )


def _log_cycle_degradation_report(tracker: CycleDegradationTracker) -> dict[str, object]:
    summary = tracker.build_summary()
    if not tracker.is_degraded:
        logger.info(
            "cycle_id=%s status=healthy phases_failed=0 phases_skipped=0",
            tracker.cycle_id,
        )
        return summary

    logger.warning(
        "cycle_id=%s status=degraded critically_degraded=%s failed_phases=%s skipped_phases=%s",
        tracker.cycle_id,
        summary["critically_degraded"],
        summary["failed_phases"],
        summary["skipped_phases"],
    )
    for root_cause in summary["root_causes"]:
        if not isinstance(root_cause, dict):
            continue
        logger.warning(
            "cycle_id=%s root_cause phase=%s criticality=%s error=%s",
            tracker.cycle_id,
            root_cause.get("phase"),
            root_cause.get("criticality"),
            root_cause.get("error"),
        )
    return summary


def _log_phase_sync_metrics(label: str, *, total_items: int, successful_items: int) -> None:
    failed_items = max(0, total_items - successful_items)
    logger.info(
        "%s metrics: total=%s synced=%s failed=%s",
        label,
        total_items,
        successful_items,
        failed_items,
    )


def _now_ms() -> float:
    return time.perf_counter() * 1000


def run_monitored_steam_metrics_sync(client: BackendClient) -> tuple[int, PushResult]:
    entries = fetch_with_retry(
        "Monitored Steam metrics fetch",
        fetch_monitored_steam_live_metrics,
    )

    if not entries:
        logger.warning("No monitored Steam live-player patches collected this cycle.")
        return 0, PushResult(success=True, status_code=204)

    payload = SyncGameCatalogRequest(entries=entries)
    logger.info("Prepared %s monitored Steam live-player payloads", len(entries))
    result = client.sync_game_catalog(payload)
    _log_push_result("Monitored Steam metrics sync", result)
    return len(entries), result


def run_monitored_twitch_metrics_sync(client: BackendClient) -> tuple[int, PushResult]:
    entries = fetch_with_retry(
        "Monitored Twitch metrics fetch",
        fetch_monitored_twitch_live_metrics,
    )

    if not entries:
        logger.warning("No monitored Twitch viewer patches collected this cycle.")
        return 0, PushResult(success=True, status_code=204)

    payload = SyncGameCatalogRequest(entries=entries)
    logger.info("Prepared %s monitored Twitch viewer payloads", len(entries))
    result = client.sync_game_catalog(payload)
    _log_push_result("Monitored Twitch metrics sync", result)
    return len(entries), result


def run_catalog_sync(client: BackendClient) -> tuple[int, PushResult]:
    entries = fetch_with_retry("Steam catalog fetch", fetch_steam_charts_catalog)
    return _sync_prefetched_catalog(client, entries)


def run_twitch_catalog_sync(client: BackendClient) -> tuple[int, PushResult]:
    bundle = fetch_dynamic_catalog_entries()
    return _sync_prefetched_dynamic_catalog(client, bundle)


def _merge_dynamic_catalog_entries(
    primary: list[GameCatalogEntryPayload],
    secondary: list[GameCatalogEntryPayload],
) -> list[GameCatalogEntryPayload]:
    merged: dict[str, GameCatalogEntryPayload] = {}
    order: list[str] = []

    for entry in primary:
        if entry.slug not in merged:
            order.append(entry.slug)
        merged[entry.slug] = entry

    for entry in secondary:
        existing = merged.get(entry.slug)
        if existing is None:
            merged[entry.slug] = entry
            order.append(entry.slug)
            continue

        merged[entry.slug] = existing.model_copy(
            update={
                "steam_app_id": existing.steam_app_id or entry.steam_app_id,
                "logo_url": existing.logo_url or entry.logo_url,
                "cover_url": existing.cover_url or entry.cover_url,
                "igdb_game_id": existing.igdb_game_id or entry.igdb_game_id,
                "genre_name": existing.genre_name or entry.genre_name,
                "user_rating": existing.user_rating or entry.user_rating,
                "critic_rating": existing.critic_rating or entry.critic_rating,
                "screenshot_urls": existing.screenshot_urls or entry.screenshot_urls,
                "trailer_video_ids": existing.trailer_video_ids or entry.trailer_video_ids,
            }
        )

    return [merged[slug] for slug in order]


def run_release_sync(client: BackendClient) -> tuple[int, PushResult]:
    releases = fetch_with_retry("Upcoming releases fetch", fetch_upcoming_releases)
    return _sync_prefetched_releases(client, releases)


def run_social_status_sync(client: BackendClient) -> tuple[int, PushResult]:
    entries = fetch_with_retry("Social status fetch", fetch_social_status_payloads)
    return _sync_prefetched_social(client, entries)


def run_status_sync(
    client: BackendClient,
    runtime_metrics: CycleRuntimeMetrics | None = None,
) -> tuple[int, PushResult]:
    telemetry_entries = fetch_with_retry("Game telemetry fetch", fetch_game_telemetry)

    if not telemetry_entries:
        logger.warning(
            "No telemetry entries collected this cycle; backend state preserved.",
        )
        return 0, PushResult(success=True, status_code=204)

    logger.info("Prepared %s telemetry payloads", len(telemetry_entries))
    successful_items, results = _push_batches_with_fallback(
        items=telemetry_entries,
        batch_size=settings.batch_size_telemetry_sync,
        push_batch=lambda batch: client.sync_game_telemetry(
            SyncTelemetryRequest(entries=list(batch))
        ),
        label="Telemetry sync",
        runtime_metrics=runtime_metrics,
    )
    if runtime_metrics is not None:
        runtime_metrics.items_total += len(telemetry_entries)
        runtime_metrics.items_synced += successful_items
    _log_phase_sync_metrics(
        "Telemetry sync",
        total_items=len(telemetry_entries),
        successful_items=successful_items,
    )
    return len(telemetry_entries), _aggregate_results(
        results=results,
        successful_items=successful_items,
        total_items=len(telemetry_entries),
        empty_status=204,
        empty_error="No telemetry pushes attempted",
    )


def run_platform_intel_pipeline(client: BackendClient) -> tuple[int, int, int, PushResult]:
    scraped_events = fetch_with_retry(
        "Platform feed events fetch",
        fetch_all_platform_feed_events,
    )
    return _sync_prefetched_platform_intel(client, scraped_events)


def fetch_dynamic_catalog_entries() -> DynamicCatalogBundle:
    twitch_entries = fetch_with_retry(
        "Twitch top games fetch",
        fetch_twitch_top_games_catalog,
    )
    igdb_entries = fetch_with_retry(
        "IGDB popular games fetch",
        lambda: fetch_igdb_popular_catalog(limit=settings.twitch_top_n),
    )
    return DynamicCatalogBundle(
        entries=_merge_dynamic_catalog_entries(twitch_entries, igdb_entries),
        twitch_count=len(twitch_entries),
        igdb_count=len(igdb_entries),
    )


def run_harvest_cycle(client: BackendClient) -> HarvestCycleReport:
    cycle_id = generate_cycle_id()
    degradation_tracker = CycleDegradationTracker(cycle_id=cycle_id)
    resilience = {
        "cycle_id": cycle_id,
        "degradation_tracker": degradation_tracker,
        "circuit_breaker": harvest_phase_circuit,
    }
    logger.info("Starting harvest cycle cycle_id=%s", cycle_id)
    runtime_metrics = CycleRuntimeMetrics()

    health = client.health_check()
    if not health.success:
        logger.warning(
            "cycle_id=%s backend health check did not pass. Harvest will continue and retry pushes.",
            cycle_id,
        )

    preload_started_ms = _now_ms()
    catalog_preload = run_phase_safe(
        "catalog_preload",
        preload_catalog_snapshot,
        CatalogPreload(game_id_by_slug={}),
        **resilience,
    )
    runtime_metrics.preload_duration_ms = _now_ms() - preload_started_ms

    tier_report = run_phase_safe(
        "tier_maintenance",
        run_tier_maintenance,
        TierTrendReport(ran=False, reason="phase_failed"),
        **resilience,
    )
    if tier_report.ran:
        logger.info(
            "cycle_id=%s tier rebalance: promotions=%s demotions=%s buckets=%s",
            cycle_id,
            list(tier_report.promotions),
            list(tier_report.demotions),
            tier_report.tier_counts,
        )
    elif tier_report.tier_counts:
        logger.info(
            "cycle_id=%s tier buckets synced: %s",
            cycle_id,
            tier_report.tier_counts,
        )

    on_demand_jobs, on_demand_sync = run_phase_safe(
        "on_demand_jobs",
        lambda: run_on_demand_scrape_jobs(client),
        (0, PushResult(success=False, error_message="phase failed")),
        **resilience,
    )
    if on_demand_jobs > 0:
        _log_push_result("On-demand scrape jobs", on_demand_sync)

    scheduled_items, scheduled_sync = run_phase_safe(
        "scheduled_harvest",
        lambda: run_scheduled_harvest_workload(client),
        (0, PushResult(success=False, error_message="phase failed")),
        **resilience,
    )
    if scheduled_items > 0:
        _log_push_result("Scheduled harvest workload", scheduled_sync)

    # Phase 2: parallel fetch, ordered sync (same functional behavior)
    fetch_started_ms = _now_ms()
    with ThreadPoolExecutor(max_workers=4) as executor:
        fetch_futures = {
            "releases": executor.submit(
                fetch_with_retry,
                "Upcoming releases fetch",
                fetch_upcoming_releases,
            ),
            "catalog": executor.submit(
                fetch_with_retry,
                "Steam catalog fetch",
                fetch_steam_charts_catalog,
            ),
            "dynamic_catalog": executor.submit(fetch_dynamic_catalog_entries),
            "social": executor.submit(
                fetch_with_retry,
                "Social status fetch",
                fetch_social_status_payloads,
            ),
            "platform_events": executor.submit(
                fetch_with_retry,
                "Platform feed events fetch",
                fetch_all_platform_feed_events,
            ),
        }

        prefetched_releases = _resolve_prefetched_result(
            fetch_futures, "releases", [], **resilience
        )
        prefetched_catalog = _resolve_prefetched_result(
            fetch_futures, "catalog", [], **resilience
        )
        prefetched_dynamic_catalog = _resolve_prefetched_result(
            fetch_futures,
            "dynamic_catalog",
            DynamicCatalogBundle(entries=[], twitch_count=0, igdb_count=0),
            **resilience,
        )
        prefetched_social = _resolve_prefetched_result(
            fetch_futures, "social", [], **resilience
        )
        prefetched_platform_events = _resolve_prefetched_result(
            fetch_futures, "platform_events", [], **resilience
        )
    runtime_metrics.fetch_duration_ms = _now_ms() - fetch_started_ms

    sync_started_ms = _now_ms()
    releases_prepared, release_sync = run_phase_safe(
        "release_sync",
        lambda: _sync_prefetched_releases(client, prefetched_releases, runtime_metrics),
        (0, PushResult(success=False, error_message="phase failed")),
        **resilience,
    )
    catalog_prepared, catalog_sync = run_phase_safe(
        "catalog_sync",
        lambda: _sync_prefetched_catalog(client, prefetched_catalog, runtime_metrics),
        (0, PushResult(success=False, error_message="phase failed")),
        **resilience,
    )
    twitch_catalog_prepared, twitch_catalog_sync = run_phase_safe(
        "twitch_catalog_sync",
        lambda: _sync_prefetched_dynamic_catalog(client, prefetched_dynamic_catalog, runtime_metrics),
        (0, PushResult(success=False, error_message="phase failed")),
        **resilience,
    )
    social_prepared, social_sync = run_phase_safe(
        "social_status_sync",
        lambda: _sync_prefetched_social(client, prefetched_social, runtime_metrics),
        (0, PushResult(success=False, error_message="phase failed")),
        **resilience,
    )
    telemetry_prepared = scheduled_items
    telemetry_sync = scheduled_sync
    platform_events_scraped, platform_events_pushed, context_chunks_indexed, platform_intel_sync = run_phase_safe(
        "platform_intel_pipeline",
        lambda: _sync_prefetched_platform_intel(client, prefetched_platform_events, catalog_preload),
        (0, 0, 0, PushResult(success=False, error_message="phase failed")),
        **resilience,
    )
    sync_duration_ms = _now_ms() - sync_started_ms
    runtime_metrics.normalization_duration_ms = max(
        0.0,
        sync_duration_ms - runtime_metrics.batch_sync_duration_ms,
    )

    degradation_summary = _log_cycle_degradation_report(degradation_tracker)
    logger.info(
        "cycle_id=%s harvest cycle finished (social=%s pushed=%s degraded=%s)",
        cycle_id,
        social_prepared,
        social_sync.success,
        degradation_tracker.is_degraded,
    )
    return HarvestCycleReport(
        releases_prepared=releases_prepared,
        release_sync=release_sync,
        catalog_prepared=catalog_prepared,
        catalog_sync=catalog_sync,
        twitch_catalog_prepared=twitch_catalog_prepared,
        twitch_catalog_sync=twitch_catalog_sync,
        telemetry_prepared=telemetry_prepared,
        telemetry_sync=telemetry_sync,
        platform_events_scraped=platform_events_scraped,
        platform_events_pushed=platform_events_pushed,
        context_chunks_indexed=context_chunks_indexed,
        platform_intel_sync=platform_intel_sync,
        backend_reachable=health.success,
        runtime_metrics=runtime_metrics,
        cycle_id=cycle_id,
        degraded=degradation_tracker.is_degraded,
        degradation_summary=degradation_summary,
    )


def _sync_prefetched_releases(
    client: BackendClient,
    releases: list,
    runtime_metrics: CycleRuntimeMetrics | None = None,
) -> tuple[int, PushResult]:
    if not releases:
        logger.info("No upcoming releases to sync this cycle.")
        return 0, PushResult(success=True, status_code=204)

    logger.info("Prepared %s normalized release payloads", len(releases))
    for release in releases:
        platform_summary = ", ".join(
            f"{entry.platform.value}: "
            f"{entry.release_date.isoformat() if entry.release_date else 'TBA'}"
            for entry in release.platforms
        )
        logger.info(
            "[%s] %s | genre=%s | imageUrl=%s | logoUrl=%s | platforms=[%s]",
            release.slug,
            release.game_name,
            release.genre.value,
            release.image_url or "none",
            release.logo_url or "none",
            platform_summary,
        )
    successful_items, results = _push_batches_with_fallback(
        items=releases,
        batch_size=settings.batch_size_release_sync,
        push_batch=lambda batch: client.sync_game_releases(
            SyncGamesRequest(releases=list(batch))
        ),
        label="Release sync",
        runtime_metrics=runtime_metrics,
    )
    if runtime_metrics is not None:
        runtime_metrics.items_total += len(releases)
        runtime_metrics.items_synced += successful_items
    _log_phase_sync_metrics(
        "Release sync",
        total_items=len(releases),
        successful_items=successful_items,
    )
    return len(releases), _aggregate_results(
        results=results,
        successful_items=successful_items,
        total_items=len(releases),
        empty_status=204,
        empty_error="No release pushes attempted",
    )


def _sync_prefetched_catalog(
    client: BackendClient,
    entries: list[GameCatalogEntryPayload],
    runtime_metrics: CycleRuntimeMetrics | None = None,
) -> tuple[int, PushResult]:
    if not entries:
        logger.warning("No Steam Charts catalog entries collected this cycle.")
        return 0, PushResult(success=True, status_code=204)
    logger.info("Prepared %s Steam catalog payloads", len(entries))
    successful_items, results = _push_batches_with_fallback(
        items=entries,
        batch_size=settings.batch_size_catalog_sync,
        push_batch=lambda batch: client.sync_game_catalog(
            SyncGameCatalogRequest(entries=list(batch))
        ),
        label="Catalog sync",
        runtime_metrics=runtime_metrics,
    )
    if runtime_metrics is not None:
        runtime_metrics.items_total += len(entries)
        runtime_metrics.items_synced += successful_items
    _log_phase_sync_metrics(
        "Catalog sync",
        total_items=len(entries),
        successful_items=successful_items,
    )
    return len(entries), _aggregate_results(
        results=results,
        successful_items=successful_items,
        total_items=len(entries),
        empty_status=204,
        empty_error="No catalog pushes attempted",
    )


def _sync_prefetched_dynamic_catalog(
    client: BackendClient,
    bundle: DynamicCatalogBundle,
    runtime_metrics: CycleRuntimeMetrics | None = None,
) -> tuple[int, PushResult]:
    entries = bundle.entries
    if not entries:
        logger.warning("No dynamic catalog entries collected this cycle.")
        return 0, PushResult(success=True, status_code=204)
    logger.info(
        "Prepared %s dynamic catalog payloads (twitch=%s igdb=%s)",
        len(entries),
        bundle.twitch_count,
        bundle.igdb_count,
    )
    successful_items, results = _push_batches_with_fallback(
        items=entries,
        batch_size=settings.batch_size_dynamic_catalog_sync,
        push_batch=lambda batch: client.sync_game_catalog(
            SyncGameCatalogRequest(entries=list(batch))
        ),
        label="Dynamic catalog sync",
        runtime_metrics=runtime_metrics,
    )
    if runtime_metrics is not None:
        runtime_metrics.items_total += len(entries)
        runtime_metrics.items_synced += successful_items
    _log_phase_sync_metrics(
        "Dynamic catalog sync",
        total_items=len(entries),
        successful_items=successful_items,
    )
    return len(entries), _aggregate_results(
        results=results,
        successful_items=successful_items,
        total_items=len(entries),
        empty_status=204,
        empty_error="No dynamic catalog pushes attempted",
    )


def _sync_prefetched_social(
    client: BackendClient,
    entries: list,
    runtime_metrics: CycleRuntimeMetrics | None = None,
) -> tuple[int, PushResult]:
    if not entries:
        logger.warning("No social status entries collected this cycle.")
        return 0, PushResult(success=True, status_code=204)
    pushed = 0
    last_result = PushResult(success=False, error_message="No social status pushes attempted")
    for entry, result in zip(
        entries,
        chunked_batch_sync(entries, sync_fn=client.push_service_status),
        strict=False,
    ):
        _log_push_result(f"Social status ({entry.service_slug})", result)
        if result.success:
            pushed += 1
        last_result = result
    aggregate_result = PushResult(
        success=pushed > 0,
        status_code=last_result.status_code,
        attempts=last_result.attempts,
        error_message=last_result.error_message,
    )
    if runtime_metrics is not None:
        runtime_metrics.items_total += len(entries)
        runtime_metrics.items_synced += pushed
    logger.info("Prepared %s social status payloads (%s pushed)", len(entries), pushed)
    return len(entries), aggregate_result


def _sync_prefetched_platform_intel(
    client: BackendClient,
    scraped_events: list,
    catalog_preload: CatalogPreload,
) -> tuple[int, int, int, PushResult]:
    recent_events = filter_recent_events(scraped_events)
    dedup_store = DedupStore.from_settings()
    new_events = filter_new_events(recent_events, dedup_store)
    dedup_store.persist()

    logger.info(
        "Platform intel scraped=%s recent=%s new=%s",
        len(scraped_events),
        len(recent_events),
        len(new_events),
    )

    indexed_chunks, context_store = ingest_events_into_context_store(recent_events)
    news_push_store = NewsPushStore.from_settings()
    news_pushed = push_news_events(client, recent_events, news_push_store)
    skill_router = SkillRouter(context_store=context_store)

    if news_pushed > 0:
        logger.info("Stored %s raw news item(s) from platform feeds", news_pushed)

    if not new_events:
        logger.info("No new platform intel events after deduplication")
        return len(scraped_events), 0, indexed_chunks, PushResult(success=True, status_code=200)

    pushed_count = 0
    last_result = PushResult(success=False, error_message="No platform intel pushes attempted")

    for event in new_events:
        preloaded_game_id = catalog_preload.resolve_game_id(event.game_tag)
        if preloaded_game_id is None:
            logger.debug("No preloaded game_id for slug=%s", event.game_tag)
        execution = skill_router.execute(event)
        dispatch_report = dispatch_skill_result(client, event, execution)

        if dispatch_report.skipped:
            logger.info(
                "Skill dispatch skipped for [%s]: %s",
                event.game_tag,
                dispatch_report.skip_reason,
            )
            continue

        if dispatch_report.telemetry_push is not None:
            _log_push_result(
                f"Incident telemetry ({execution.skill_type.value})",
                dispatch_report.telemetry_push,
            )
        if dispatch_report.news_push is not None:
            _log_push_result(
                f"Skill news ({execution.skill_type.value})",
                dispatch_report.news_push,
            )

        if dispatch_report.success:
            pushed_count += 1
            last_result = dispatch_report.news_push or dispatch_report.telemetry_push or last_result
        else:
            last_result = dispatch_report.news_push or dispatch_report.telemetry_push or last_result

    aggregate_result = PushResult(
        success=pushed_count > 0,
        status_code=last_result.status_code,
        attempts=last_result.attempts,
        error_message=last_result.error_message,
    )
    return len(scraped_events), pushed_count, indexed_chunks, aggregate_result


def _resolve_prefetched_result(
    futures: dict[str, object],
    key: str,
    fallback: T,
    *,
    cycle_id: str,
    degradation_tracker: CycleDegradationTracker,
    circuit_breaker: HarvestPhaseCircuitBreaker,
) -> T:
    return run_phase_safe(
        f"fetch_{key}",
        lambda: futures[key].result(),
        fallback,
        cycle_id=cycle_id,
        degradation_tracker=degradation_tracker,
        circuit_breaker=circuit_breaker,
    )


def run_scheduled_loop(client: BackendClient, interval_seconds: int) -> None:
    logger.info(
        "Autonomous harvester started. Interval=%ss | Retries=%s | Delay=%ss",
        interval_seconds,
        settings.request_retry_max_attempts,
        settings.request_retry_delay_seconds,
    )

    cycle_number = 0

    while not _shutdown_requested:
        cycle_number += 1
        logger.info("=== Harvest cycle #%s ===", cycle_number)

        try:
            run_harvest_cycle(client)
        except Exception:
            logger.exception(
                "Unhandled error in scheduled loop. Continuing after sleep.",
            )

        if _shutdown_requested:
            break

        logger.info("Sleeping %ss until next cycle...", interval_seconds)
        _sleep_with_shutdown(interval_seconds)

    logger.info("Harvester stopped gracefully.")


def run_benchmark_cycles(
    client: BackendClient,
    cycles: int,
    benchmark_output_json: str | None = None,
) -> None:
    if cycles <= 0:
        logger.warning("benchmark-cycles must be >= 1")
        return

    logger.info("Benchmark mode enabled. Running %s fixed cycle(s).", cycles)
    metrics_samples: list[CycleRuntimeMetrics] = []

    for cycle_number in range(1, cycles + 1):
        if _shutdown_requested:
            logger.info("Benchmark interrupted by shutdown signal.")
            break
        logger.info("=== Benchmark cycle #%s/%s ===", cycle_number, cycles)
        report = run_harvest_cycle(client)
        if report.runtime_metrics is not None:
            metrics_samples.append(report.runtime_metrics)

    report_payload = _log_benchmark_report(metrics_samples, requested_cycles=cycles)
    if report_payload is not None and benchmark_output_json:
        _write_benchmark_report_json(benchmark_output_json, report_payload)


def _log_benchmark_report(
    samples: list[CycleRuntimeMetrics],
    *,
    requested_cycles: int,
) -> dict[str, object] | None:
    executed_cycles = len(samples)
    if executed_cycles == 0:
        logger.warning("Benchmark report unavailable: no completed cycles.")
        return None

    avg_preload = sum(sample.preload_duration_ms for sample in samples) / executed_cycles
    avg_fetch = sum(sample.fetch_duration_ms for sample in samples) / executed_cycles
    avg_normalization = (
        sum(sample.normalization_duration_ms for sample in samples) / executed_cycles
    )
    avg_batch_sync = (
        sum(sample.batch_sync_duration_ms for sample in samples) / executed_cycles
    )
    total_batch_calls = sum(sample.batch_calls_total for sample in samples)
    total_successful_batch_calls = sum(sample.batch_calls_successful for sample in samples)
    total_items = sum(sample.items_total for sample in samples)
    total_items_synced = sum(sample.items_synced for sample in samples)
    batch_success_rate = (
        (total_successful_batch_calls / total_batch_calls) * 100
        if total_batch_calls > 0
        else 100.0
    )

    logger.info("=== Benchmark analytics report ===")
    logger.info(
        "cycles_requested=%s cycles_executed=%s",
        requested_cycles,
        executed_cycles,
    )
    logger.info(
        "avg_duration_ms preload=%.2f fetch_concurrent=%.2f normalization=%.2f batch_sync=%.2f",
        avg_preload,
        avg_fetch,
        avg_normalization,
        avg_batch_sync,
    )
    logger.info(
        "batch_success_rate=%.2f%% batches_successful=%s batches_total=%s",
        batch_success_rate,
        total_successful_batch_calls,
        total_batch_calls,
    )
    logger.info(
        "items_processed total=%s synced=%s failed=%s",
        total_items,
        total_items_synced,
        max(0, total_items - total_items_synced),
    )
    return {
        "cycles": {
            "requested": requested_cycles,
            "executed": executed_cycles,
        },
        "avg_duration_ms": {
            "preload": round(avg_preload, 2),
            "fetch_concurrent": round(avg_fetch, 2),
            "normalization": round(avg_normalization, 2),
            "batch_sync": round(avg_batch_sync, 2),
        },
        "batch": {
            "success_rate_percent": round(batch_success_rate, 2),
            "successful": total_successful_batch_calls,
            "total": total_batch_calls,
        },
        "items_processed": {
            "total": total_items,
            "synced": total_items_synced,
            "failed": max(0, total_items - total_items_synced),
        },
    }


def _write_benchmark_report_json(path: str, payload: dict[str, object]) -> None:
    output_path = Path(path)
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=True),
            encoding="utf-8",
        )
        logger.info("Benchmark report JSON saved to %s", output_path)
    except OSError:
        logger.exception("Failed to write benchmark report JSON to %s", output_path)


def _sleep_with_shutdown(total_seconds: int) -> None:
    elapsed = 0
    while elapsed < total_seconds and not _shutdown_requested:
        time.sleep(1)
        elapsed += 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="StatusTimer autonomous data harvester",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single harvest cycle and exit.",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=settings.harvest_interval_seconds,
        help="Seconds between harvest cycles (default: env HARVEST_INTERVAL_SECONDS).",
    )
    parser.add_argument(
        "--benchmark-cycles",
        type=int,
        default=0,
        help="Run exactly N cycles and print benchmark analytics report.",
    )
    parser.add_argument(
        "--benchmark-output-json",
        type=str,
        default=None,
        help="Optional path to save benchmark analytics JSON (requires --benchmark-cycles).",
    )
    return parser.parse_args()


def main() -> None:
    signal.signal(signal.SIGINT, _handle_shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _handle_shutdown)

    args = parse_args()
    client = BackendClient()
    from pipeline.tier_trends import bootstrap_tier_resolution_cache

    bootstrap_tier_resolution_cache()
    resilient_http.set_outage_callback(
        lambda domain, active: client.report_api_outage(domain, active)
    )

    if args.benchmark_cycles > 0:
        run_benchmark_cycles(
            client,
            cycles=args.benchmark_cycles,
            benchmark_output_json=args.benchmark_output_json,
        )
        return

    if args.benchmark_output_json:
        logger.warning(
            "--benchmark-output-json ignored because --benchmark-cycles is not enabled."
        )

    if args.once:
        run_harvest_cycle(client)
        return

    run_scheduled_loop(client, interval_seconds=args.interval)


if __name__ == "__main__":
    main()
