"""Routes parsed skill outputs to Spring Boot internal sync endpoints."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from models.feed_events import ScrapedFeedEvent
from models.schemas import PatchNotePayload
from models.telemetry import GameTelemetryPayload, SyncTelemetryRequest, TelemetrySource, TelemetryStatus
from pipeline.skill_models import SkillExecutionResult, SkillType
from scrapers.text_utils import clean_news_title, is_relevant_gaming_news

logger = logging.getLogger(__name__)


@dataclass
class SkillDispatchReport:
    news_push: PushResult | None = None
    telemetry_push: PushResult | None = None
    skipped: bool = False
    skip_reason: str | None = None
    extra_results: list[PushResult] = field(default_factory=list)

    @property
    def success(self) -> bool:
        if self.skipped:
            return True

        results = [result for result in [self.news_push, self.telemetry_push] if result is not None]
        results.extend(self.extra_results)
        return bool(results) and all(result.success for result in results)


def dispatch_skill_result(
    client: BackendClient,
    event: ScrapedFeedEvent,
    execution: SkillExecutionResult,
) -> SkillDispatchReport:
    if execution.skill_type == SkillType.INCIDENT_SKILL:
        return _dispatch_incident_skill(client, event, execution)

    if execution.skill_type == SkillType.PATCH_NOTE_SKILL:
        return _dispatch_patch_note_skill(client, event, execution)

    return _dispatch_release_skill(client, event, execution)


def _dispatch_incident_skill(
    client: BackendClient,
    event: ScrapedFeedEvent,
    execution: SkillExecutionResult,
) -> SkillDispatchReport:
    output = execution.incident_output
    if output is None or not output.is_actionable:
        logger.info(
            "Incident skill skipped for %s: non-actionable summary",
            event.game_tag,
        )
        return SkillDispatchReport(
            skipped=True,
            skip_reason="non_actionable_incident",
        )

    telemetry_status = _map_incident_status(output.status)
    telemetry_payload = GameTelemetryPayload(
        gameSlug=event.game_tag,
        status=telemetry_status,
        latencyMs=0,
        dataSource=_map_telemetry_source(event.source.value),
    )
    telemetry_push = client.sync_game_telemetry(
        SyncTelemetryRequest(entries=[telemetry_payload]),
    )

    news_payload = PatchNotePayload(
        title=clean_news_title(event.title),
        content=output.summary,
        gameTag=event.game_tag,
        publishedAt=event.published_at,
    )
    news_push = client.push_patch_note(news_payload)

    return SkillDispatchReport(
        news_push=news_push,
        telemetry_push=telemetry_push,
    )


def _dispatch_patch_note_skill(
    client: BackendClient,
    event: ScrapedFeedEvent,
    execution: SkillExecutionResult,
) -> SkillDispatchReport:
    output = execution.patch_note_output
    if output is None:
        return SkillDispatchReport(skipped=True, skip_reason="missing_patch_note_output")

    news_payload = PatchNotePayload(
        title=clean_news_title(output.title),
        content=output.summary_markdown,
        gameTag=output.game_tag,
        publishedAt=event.published_at,
    )
    if not is_relevant_gaming_news(news_payload.title, news_payload.content):
        logger.info(
            "Skipping low-signal patch note for %s: %s",
            output.game_tag,
            news_payload.title,
        )
        return SkillDispatchReport(skipped=True, skip_reason="low_signal_news")

    return SkillDispatchReport(news_push=client.push_patch_note(news_payload))


def _dispatch_release_skill(
    client: BackendClient,
    event: ScrapedFeedEvent,
    execution: SkillExecutionResult,
) -> SkillDispatchReport:
    output = execution.release_output
    if output is None:
        return SkillDispatchReport(skipped=True, skip_reason="missing_release_output")

    feature_block = "\n".join(f"- {feature}" for feature in output.features) or "- Not specified"
    platform_block = ", ".join(output.platforms) if output.platforms else "Not specified"
    launch_window = output.launch_window or "Not specified"

    content = "\n".join(
        [
            output.summary_markdown,
            "",
            "**Features**",
            feature_block,
            "",
            f"**Platforms:** {platform_block}",
            f"**Launch Window:** {launch_window}",
        ]
    )

    news_payload = PatchNotePayload(
        title=clean_news_title(output.title),
        content=content,
        gameTag=output.game_tag,
        publishedAt=event.published_at,
    )
    if not is_relevant_gaming_news(news_payload.title, news_payload.content):
        logger.info(
            "Skipping low-signal release news for %s: %s",
            output.game_tag,
            news_payload.title,
        )
        return SkillDispatchReport(skipped=True, skip_reason="low_signal_news")

    return SkillDispatchReport(news_push=client.push_patch_note(news_payload))


def _map_incident_status(raw_status: str) -> TelemetryStatus:
    normalized = raw_status.upper()
    if normalized == "DOWN":
        return TelemetryStatus.DOWN
    if normalized == "MAINTENANCE":
        return TelemetryStatus.MAINTENANCE
    if normalized == "ONLINE":
        return TelemetryStatus.ONLINE
    return TelemetryStatus.MAINTENANCE


def _map_telemetry_source(source_value: str) -> TelemetrySource:
    if source_value == "STEAM":
        return TelemetrySource.STEAM_API
    return TelemetrySource.STATUS_PAGE
