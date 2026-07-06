"""Process on-demand scrape jobs claimed from the backend queue."""

from __future__ import annotations

import logging

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from models.telemetry import GameTelemetryPayload, SyncTelemetryRequest
from scrapers.status import fetch_telemetry_for_slug

logger = logging.getLogger(__name__)


def run_on_demand_scrape_jobs(client: BackendClient, limit: int = 10) -> tuple[int, PushResult]:
    jobs = client.claim_pending_scrape_jobs(limit=limit)
    if not jobs:
        return 0, PushResult(success=True, status_code=204)

    payloads: list[GameTelemetryPayload] = []
    completed_job_ids: list[int] = []
    failed_job_ids: list[int] = []

    for job in jobs:
        job_id = int(job["id"])
        slug = str(job["slug"])
        steam_app_id = job.get("steamAppId")
        game_name = str(job.get("gameName") or slug)

        parsed_app_id = int(steam_app_id) if isinstance(steam_app_id, int) else None
        payload = fetch_telemetry_for_slug(
            slug,
            steam_app_id=parsed_app_id,
            display_name=game_name,
        )

        if payload is None:
            failed_job_ids.append(job_id)
            continue

        payloads.append(payload)
        completed_job_ids.append(job_id)

    if not payloads:
        for job_id in failed_job_ids:
            client.complete_scrape_job(job_id, "FAILED")
        return len(jobs), PushResult(success=False, status_code=422, error_message="no payloads")

    sync_result = client.sync_game_telemetry(SyncTelemetryRequest(entries=payloads))
    final_status = "DONE" if sync_result.success else "FAILED"

    for job_id in completed_job_ids:
        client.complete_scrape_job(job_id, final_status)
    for job_id in failed_job_ids:
        client.complete_scrape_job(job_id, "FAILED")

    logger.info(
        "On-demand scrape jobs processed=%s synced=%s success=%s",
        len(jobs),
        len(payloads),
        sync_result.success,
    )
    return len(jobs), sync_result
