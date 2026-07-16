"""Deterministic incident dispatch for official platform status feeds."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from models.schemas import PatchNotePayload
from models.telemetry import GameTelemetryPayload, SyncTelemetryRequest, TelemetrySource, TelemetryStatus
from scrapers.text_utils import clean_news_title

logger = logging.getLogger(__name__)

TELEMETRY_EXCLUDED_GAME_TAGS = frozenset({"epic-games"})


@dataclass
class IncidentDispatchReport:
    news_push: PushResult | None = None
    telemetry_push: PushResult | None = None
    skipped: bool = False
    skip_reason: str | None = None

    @property
    def success(self) -> bool:
        if self.skipped:
            return True

        results = [result for result in [self.news_push, self.telemetry_push] if result is not None]
        return bool(results) and all(result.success for result in results)


def dispatch_incident_event(
    client: BackendClient,
    event: ScrapedFeedEvent,
) -> IncidentDispatchReport:
    if event.kind != FeedEventKind.INCIDENT:
        return IncidentDispatchReport(skipped=True, skip_reason="not_an_incident")

    status = _resolve_incident_status(event)
    summary = _build_incident_summary(event)

    telemetry_push: PushResult | None = None
    if event.game_tag not in TELEMETRY_EXCLUDED_GAME_TAGS:
        telemetry_payload = GameTelemetryPayload(
            gameSlug=event.game_tag,
            status=status,
            latencyMs=0,
            dataSource=_map_telemetry_source(event.source),
        )
        telemetry_push = client.sync_game_telemetry(
            SyncTelemetryRequest(entries=[telemetry_payload]),
        )
    else:
        logger.info(
            "Skipping incident telemetry for unmapped slug=%s (%s)",
            event.game_tag,
            event.title,
        )

    news_payload = PatchNotePayload(
        title=clean_news_title(event.title),
        content=summary,
        gameTag=event.game_tag,
        publishedAt=event.published_at,
    )
    news_push = client.push_patch_note(news_payload)

    return IncidentDispatchReport(
        news_push=news_push,
        telemetry_push=telemetry_push,
    )


def _resolve_incident_status(event: ScrapedFeedEvent) -> TelemetryStatus:
    haystack = f"{event.title}\n{event.plain_text}".lower()
    if "in progress" in haystack or "in_progress" in haystack:
        return TelemetryStatus.MAINTENANCE
    if "maintenance" in haystack and "scheduled" not in haystack:
        return TelemetryStatus.MAINTENANCE
    return TelemetryStatus.DOWN


def _build_incident_summary(event: ScrapedFeedEvent) -> str:
    summary = event.plain_text.strip() or event.title.strip()
    if len(summary) > 280:
        return f"{summary[:277].rstrip()}..."
    return summary


def _map_telemetry_source(source: FeedSource) -> TelemetrySource:
    if source == FeedSource.STEAM:
        return TelemetrySource.STEAM_API
    return TelemetrySource.STATUS_PAGE
