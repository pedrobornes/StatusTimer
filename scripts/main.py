"""StatusTimer automated harvesting script entry point."""

import argparse
import logging
import signal
import time
from dataclasses import dataclass

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from config.settings import settings
from models.schemas import PatchNotePayload, SyncGamesRequest
from models.telemetry import SyncTelemetryRequest
from pipeline.patch_notes import summarize_patch_notes
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
    patch_note_push: PushResult
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
            "[%s] %s | genre=%s | platforms=[%s]",
            release.slug,
            release.game_name,
            release.genre.value,
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


def run_patch_note_pipeline(client: BackendClient) -> PushResult:
    sample_raw_patch = (
        "Weapon balance: AR damage reduced from 34 to 31. "
        "Server tick rate increased to 128Hz on competitive playlists."
    )
    tactical_markdown = summarize_patch_notes(sample_raw_patch)

    patch_note = PatchNotePayload(
        title="[PATCH SCAN] Competitive balance update",
        content=tactical_markdown,
        gameTag="valorant",
    )

    logger.info("Patch-note pipeline ready for gameTag=%s", patch_note.game_tag)
    result = client.push_patch_note(patch_note)
    _log_push_result("Patch note push", result)
    return result


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
        patch_note_push = run_patch_note_pipeline(client)
    except Exception:
        logger.exception(
            "Unexpected error during harvest cycle. Loop will continue.",
        )
        return HarvestCycleReport(
            releases_prepared=0,
            release_sync=PushResult(success=False, error_message="cycle exception"),
            telemetry_prepared=0,
            telemetry_sync=PushResult(success=False, error_message="cycle exception"),
            patch_note_push=PushResult(success=False, error_message="cycle exception"),
            backend_reachable=health.success,
        )

    logger.info("Harvest cycle finished")
    return HarvestCycleReport(
        releases_prepared=releases_prepared,
        release_sync=release_sync,
        telemetry_prepared=telemetry_prepared,
        telemetry_sync=telemetry_sync,
        patch_note_push=patch_note_push,
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
