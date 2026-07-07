"""HTTP client for StatusTimer Spring Boot internal ingestion."""

import logging
import time
from typing import Any, Callable

import requests

from clients.http_result import PushResult
from config.settings import settings
from models.catalog_schemas import SyncGameCatalogRequest
from models.schemas import GameReleasePayload, PatchNotePayload, SyncGamesRequest
from models.service_status import ServiceStatusPayload
from models.telemetry import SyncTelemetryRequest

logger = logging.getLogger(__name__)


class BackendClient:
    """Secure requests wrapper for /api/v1/internal/** endpoints."""

    INTERNAL_STATUS_PATH = "/api/v1/internal/status"
    INTERNAL_STATUS_SYNC_PATH = "/api/v1/internal/status/sync"
    INTERNAL_TELEMETRY_UPDATE_PATH = "/api/v1/internal/telemetry/update"
    INTERNAL_NEWS_PATH = "/api/v1/internal/news"
    INTERNAL_GAMES_SYNC_PATH = "/api/v1/internal/games/sync"
    INTERNAL_GAMES_CATALOG_SYNC_PATH = "/api/v1/internal/games/catalog/sync"
    INTERNAL_SCRAPE_JOBS_PENDING_PATH = "/api/v1/internal/scrape-jobs/pending"
    INTERNAL_HARVEST_WORKLOAD_PATH = "/api/v1/internal/harvest/workload"
    INTERNAL_HARVEST_COMPLETE_PATH = "/api/v1/internal/harvest/complete"

    def __init__(self) -> None:
        self._base_url = settings.backend_base_url.rstrip("/")
        self._timeout = settings.backend_request_timeout_seconds
        self._max_attempts = settings.request_retry_max_attempts
        self._retry_delay = settings.request_retry_delay_seconds
        self._headers = {
            "Content-Type": "application/json",
            "X-API-KEY": settings.backend_api_key,
        }

    def sync_game_releases(self, request: SyncGamesRequest) -> PushResult:
        """POST harvested multi-platform releases to the backend sync endpoint."""
        return self._post(
            self.INTERNAL_GAMES_SYNC_PATH,
            request.model_dump(mode="json", by_alias=True),
            "game releases sync",
        )

    def sync_game_catalog(self, request: SyncGameCatalogRequest) -> PushResult:
        """POST harvested Steam catalog entries to the backend upsert endpoint."""
        return self._post(
            self.INTERNAL_GAMES_CATALOG_SYNC_PATH,
            request.model_dump(mode="json", by_alias=True),
            "game catalog sync",
        )

    def claim_pending_scrape_jobs(self, limit: int = 10) -> list[dict[str, object]]:
        """Claim on-demand scrape jobs for priority processing."""
        url = f"{self._base_url}{self.INTERNAL_SCRAPE_JOBS_PENDING_PATH}"
        try:
            response = requests.get(
                url,
                params={"limit": str(limit)},
                headers=self._headers,
                timeout=self._timeout,
            )
        except requests.RequestException as error:
            logger.warning("Failed to claim scrape jobs: %s", error)
            return []

        if not response.ok:
            logger.warning("Failed to claim scrape jobs (HTTP %s)", response.status_code)
            return []

        payload = response.json()
        if not isinstance(payload, list):
            return []
        return [entry for entry in payload if isinstance(entry, dict)]

    def complete_scrape_job(self, job_id: int, status: str) -> PushResult:
        """Mark a claimed scrape job as DONE or FAILED."""
        path = f"/api/v1/internal/scrape-jobs/{job_id}/complete"
        return self._post(path, {"status": status}, f"scrape job {job_id} complete")

    def fetch_harvest_workload(self) -> dict[str, object] | None:
        """Fetch telemetry/metrics/news work queues based on backend timestamps."""
        url = f"{self._base_url}{self.INTERNAL_HARVEST_WORKLOAD_PATH}"
        try:
            response = requests.get(
                url,
                headers=self._headers,
                timeout=self._timeout,
            )
        except requests.RequestException as error:
            logger.warning("Failed to fetch harvest workload: %s", error)
            return None

        if response.status_code == 404:
            return None

        if not response.ok:
            logger.warning("Failed to fetch harvest workload (HTTP %s)", response.status_code)
            return None

        payload = response.json()
        return payload if isinstance(payload, dict) else None

    def complete_harvest_work(self, results: list[dict[str, object]]) -> PushResult:
        """Advance backend harvest schedules after a work batch."""
        return self._post(
            self.INTERNAL_HARVEST_COMPLETE_PATH,
            {"results": results},
            "harvest schedule completion",
        )

    def report_api_outage(self, domain: str, active: bool) -> PushResult:
        return self._post(
            "/api/v1/internal/harvest/outage",
            {"domain": domain, "active": active},
            f"api outage report ({domain})",
        )

    def upsert_game_release(self, release: GameReleasePayload) -> PushResult:
        """POST a single normalized release payload."""
        return self.sync_game_releases(SyncGamesRequest(releases=[release]))

    def push_patch_note(self, patch_note: PatchNotePayload) -> PushResult:
        """POST tactical patch-note intel to the gaming news feed."""
        return self._post(
            self.INTERNAL_NEWS_PATH,
            patch_note.model_dump(mode="json", by_alias=True),
            "patch note",
        )

    def sync_game_telemetry(self, request: SyncTelemetryRequest) -> PushResult:
        """POST live game telemetry metrics to the backend sync endpoint."""
        payload = request.model_dump(mode="json", by_alias=True)
        result = self._post(
            self.INTERNAL_TELEMETRY_UPDATE_PATH,
            payload,
            "game telemetry update",
        )
        if result.is_endpoint_missing:
            return self._post(
                self.INTERNAL_STATUS_SYNC_PATH,
                payload,
                "game telemetry sync",
            )
        return result

    def push_service_status(self, payload: ServiceStatusPayload | dict[str, Any]) -> PushResult:
        """POST social/platform server status upserts to the internal contract."""
        body = (
            payload.model_dump(mode="json", by_alias=True)
            if isinstance(payload, ServiceStatusPayload)
            else payload
        )
        return self._post(
            self.INTERNAL_STATUS_PATH,
            body,
            "service status",
        )

    def health_check(self) -> PushResult:
        """Lightweight reachability probe against the public releases endpoint."""
        url = f"{self._base_url}/api/v1/releases"
        return self._request_with_retry(
            label="backend health check",
            url=url,
            request_callable=lambda: requests.get(
                url,
                timeout=self._timeout,
            ),
        )

    def _post(
        self,
        path: str,
        payload: dict[str, Any],
        label: str,
    ) -> PushResult:
        url = f"{self._base_url}{path}"
        return self._request_with_retry(
            label=label,
            url=url,
            request_callable=lambda: requests.post(
                url,
                json=payload,
                headers=self._headers,
                timeout=self._timeout,
            ),
        )

    def _request_with_retry(
        self,
        label: str,
        url: str,
        request_callable: Callable[[], requests.Response],
    ) -> PushResult:
        last_status: int | None = None
        last_error: str | None = None

        for attempt in range(1, self._max_attempts + 1):
            try:
                response = request_callable()
                last_status = response.status_code

                if response.ok:
                    logger.info(
                        "Successfully pushed %s to %s (attempt %s/%s)",
                        label,
                        url,
                        attempt,
                        self._max_attempts,
                    )
                    return PushResult(
                        success=True,
                        status_code=response.status_code,
                        attempts=attempt,
                    )

                last_error = response.text.strip() or response.reason
                if not self._should_retry(response.status_code, attempt):
                    break

                logger.warning(
                    "%s failed with HTTP %s on attempt %s/%s. Retrying in %ss...",
                    label,
                    response.status_code,
                    attempt,
                    self._max_attempts,
                    self._retry_delay,
                )
            except requests.RequestException as error:
                last_status = None
                last_error = str(error)

                if attempt >= self._max_attempts:
                    break

                logger.warning(
                    "%s unreachable on attempt %s/%s (%s). Retrying in %ss...",
                    label,
                    attempt,
                    self._max_attempts,
                    error,
                    self._retry_delay,
                )

            time.sleep(self._retry_delay)

        self._log_final_failure(label, url, last_status, last_error)
        return PushResult(
            success=False,
            status_code=last_status,
            error_message=last_error,
            attempts=self._max_attempts,
        )

    def _should_retry(self, status_code: int, attempt: int) -> bool:
        if attempt >= self._max_attempts:
            return False

        if status_code == 404:
            return False

        if status_code in {401, 403, 422}:
            return False

        return status_code >= 500 or status_code == 429

    def _log_final_failure(
        self,
        label: str,
        url: str,
        status_code: int | None,
        error_message: str | None,
    ) -> None:
        if status_code == 404:
            logger.warning(
                "%s endpoint not available yet (HTTP 404) at %s. "
                "Harvester will keep running and retry on the next cycle.",
                label,
                url,
            )
            return

        if status_code is None:
            logger.error(
                "%s failed: backend unreachable at %s after %s attempts (%s). "
                "Harvester will keep running and retry on the next cycle.",
                label,
                url,
                self._max_attempts,
                error_message,
            )
            return

        logger.error(
            "%s failed with HTTP %s at %s after %s attempts (%s). "
            "Harvester will keep running and retry on the next cycle.",
            label,
            status_code,
            url,
            self._max_attempts,
            error_message,
        )
