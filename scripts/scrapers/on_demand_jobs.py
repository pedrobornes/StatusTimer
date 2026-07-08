"""Process on-demand scrape jobs claimed from the backend queue."""

from __future__ import annotations

import logging

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from models.telemetry import GameTelemetryPayload, SyncTelemetryRequest
from scrapers.status import fetch_telemetry_for_slug

logger = logging.getLogger(__name__)

FAILURE_NO_PROBE = "NO_PROBE"


def run_on_demand_scrape_jobs(client: BackendClient, limit: int = 10) -> tuple[int, PushResult]:
    jobs = client.claim_pending_scrape_jobs(limit=limit)
    if not jobs:
        return 0, PushResult(success=True, status_code=204)

    payloads: list[GameTelemetryPayload] = []
    completed_job_ids: list[int] = []
    failed_job_ids: list[int] = []
    no_probe_job_ids: list[int] = []

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
            no_probe_job_ids.append(job_id)
            continue

        payloads.append(payload)
        completed_job_ids.append(job_id)

    if not payloads:
        for job_id in no_probe_job_ids:
            client.complete_scrape_job(job_id, "FAILED", failure_reason=FAILURE_NO_PROBE)
        for job_id in failed_job_ids:
            if job_id not in no_probe_job_ids:
                client.complete_scrape_job(job_id, "FAILED")

        if no_probe_job_ids:
            logger.warning(
                "On-demand scrape jobs finished with no probe strategy for %s slug(s): %s",
                len(no_probe_job_ids),
                ", ".join(str(job["slug"]) for job in jobs if int(job["id"]) in no_probe_job_ids),
            )

        return len(jobs), PushResult(success=True, status_code=204)

    sync_result = client.sync_game_telemetry(SyncTelemetryRequest(entries=payloads))
    final_status = "DONE" if sync_result.success else "FAILED"

    for job_id in completed_job_ids:
        client.complete_scrape_job(job_id, final_status)
    for job_id in failed_job_ids:
        if job_id in no_probe_job_ids:
            client.complete_scrape_job(job_id, "FAILED", failure_reason=FAILURE_NO_PROBE)
        else:
            client.complete_scrape_job(job_id, "FAILED")

    logger.info(
        "On-demand scrape jobs processed=%s synced=%s success=%s",
        len(jobs),
        len(payloads),
        sync_result.success,
    )
    return len(jobs), sync_result
