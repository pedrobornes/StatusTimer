"""StatusTimer automated harvesting script entry point."""

import argparse
import logging
import signal
import time
from dataclasses import dataclass

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from config.settings import settings
from models.schemas import SyncGamesRequest
from models.telemetry import SyncTelemetryRequest
from pipeline.context_pipeline import ingest_events_into_context_store
from pipeline.deduplication import DedupStore, filter_new_events, filter_recent_events
from pipeline.skill_router import SkillRouter
from pipeline.sync_router import dispatch_skill_result
from scrapers.platform_feeds import fetch_all_platform_feed_events
from scrapers.releases import fetch_upcoming_releases
from scrapers.status import fetch_game_telemetry

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("statustimer-harvester")

_shutdown_requested = False


@dataclass(frozen=True)
class HarvestCycleReport:
    releases_prepared: int
    release_sync: PushResult
    telemetry_prepared: int
    telemetry_sync: PushResult
    platform_events_scraped: int
    platform_events_pushed: int
    context_chunks_indexed: int
    platform_intel_sync: PushResult
    backend_reachable: bool


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


def run_release_sync(client: BackendClient) -> tuple[int, PushResult]:
    releases = fetch_upcoming_releases()
    payload = SyncGamesRequest(releases=releases)

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

    result = client.sync_game_releases(payload)
    _log_push_result("Release sync", result)
    return len(releases), result


def run_status_sync(client: BackendClient) -> tuple[int, PushResult]:
    telemetry_entries = fetch_game_telemetry()
    payload = SyncTelemetryRequest(entries=telemetry_entries)

    logger.info("Prepared %s telemetry payloads", len(telemetry_entries))
    result = client.sync_game_telemetry(payload)
    _log_push_result("Telemetry sync", result)
    return len(telemetry_entries), result


def run_platform_intel_pipeline(client: BackendClient) -> tuple[int, int, int, PushResult]:
    scraped_events = fetch_all_platform_feed_events()
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
    skill_router = SkillRouter(context_store=context_store)

    if not new_events:
        logger.info("No new platform intel events after deduplication")
        return len(scraped_events), 0, indexed_chunks, PushResult(success=True, status_code=200)

    pushed_count = 0
    last_result = PushResult(success=False, error_message="No platform intel pushes attempted")

    for event in new_events:
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


def run_harvest_cycle(client: BackendClient) -> HarvestCycleReport:
    logger.info("Starting harvest cycle")

    health = client.health_check()
    if not health.success:
        logger.warning(
            "Backend health check did not pass. Harvest will continue and retry pushes.",
        )

    try:
        releases_prepared, release_sync = run_release_sync(client)
        telemetry_prepared, telemetry_sync = run_status_sync(client)
        platform_events_scraped, platform_events_pushed, context_chunks_indexed, platform_intel_sync = (
            run_platform_intel_pipeline(client)
        )
    except Exception:
        logger.exception(
            "Unexpected error during harvest cycle. Loop will continue.",
        )
        return HarvestCycleReport(
            releases_prepared=0,
            release_sync=PushResult(success=False, error_message="cycle exception"),
            telemetry_prepared=0,
            telemetry_sync=PushResult(success=False, error_message="cycle exception"),
            platform_events_scraped=0,
            platform_events_pushed=0,
            context_chunks_indexed=0,
            platform_intel_sync=PushResult(success=False, error_message="cycle exception"),
            backend_reachable=health.success,
        )

    logger.info("Harvest cycle finished")
    return HarvestCycleReport(
        releases_prepared=releases_prepared,
        release_sync=release_sync,
        telemetry_prepared=telemetry_prepared,
        telemetry_sync=telemetry_sync,
        platform_events_scraped=platform_events_scraped,
        platform_events_pushed=platform_events_pushed,
        context_chunks_indexed=context_chunks_indexed,
        platform_intel_sync=platform_intel_sync,
        backend_reachable=health.success,
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
    return parser.parse_args()


def main() -> None:
    signal.signal(signal.SIGINT, _handle_shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _handle_shutdown)

    args = parse_args()
    client = BackendClient()

    if args.once:
        run_harvest_cycle(client)
        return

    run_scheduled_loop(client, interval_seconds=args.interval)


if __name__ == "__main__":
    main()
