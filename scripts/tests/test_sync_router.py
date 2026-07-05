"""Tests for backend sync routing of skill outputs."""

import unittest
from datetime import datetime, timezone
from unittest.mock import Mock

from clients.http_result import PushResult
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.skill_models import IncidentSkillOutput, PatchNoteSkillOutput, SkillExecutionResult, SkillType
from pipeline.sync_router import dispatch_skill_result


class SyncRouterTests(unittest.TestCase):
    def test_incident_skill_dispatches_status_and_news(self) -> None:
        client = Mock()
        client.sync_game_telemetry.return_value = PushResult(success=True, status_code=200)
        client.push_patch_note.return_value = PushResult(success=True, status_code=201)

        event = self._event(kind=FeedEventKind.INCIDENT)
        execution = SkillExecutionResult(
            skill_type=SkillType.INCIDENT_SKILL,
            incident_output=IncidentSkillOutput(
                summary="Valorant authentication degraded in NA.",
                status="DOWN",
                actionable=True,
            ),
        )

        report = dispatch_skill_result(client, event, execution)
        self.assertFalse(report.skipped)
        self.assertTrue(report.success)
        client.sync_game_telemetry.assert_called_once()
        client.push_patch_note.assert_called_once()

    def test_non_actionable_incident_is_skipped(self) -> None:
        client = Mock()
        event = self._event(kind=FeedEventKind.INCIDENT)
        execution = SkillExecutionResult(
            skill_type=SkillType.INCIDENT_SKILL,
            incident_output=IncidentSkillOutput(
                summary="NO_ACTIONABLE_STATUS_INFO",
                status="UNKNOWN",
                actionable=False,
            ),
        )

        report = dispatch_skill_result(client, event, execution)
        self.assertTrue(report.skipped)
        client.sync_game_telemetry.assert_not_called()
        client.push_patch_note.assert_not_called()

    def test_patch_note_skill_dispatches_news_only(self) -> None:
        client = Mock()
        client.push_patch_note.return_value = PushResult(success=True, status_code=201)

        event = self._event(kind=FeedEventKind.NEWS)
        execution = SkillExecutionResult(
            skill_type=SkillType.PATCH_NOTE_SKILL,
            patch_note_output=PatchNoteSkillOutput(
                title="Patch 1.2",
                summary_markdown="- Rifle damage reduced.",
                game_tag="counter-strike-2",
            ),
        )

        report = dispatch_skill_result(client, event, execution)
        self.assertTrue(report.success)
        client.sync_game_telemetry.assert_not_called()
        client.push_patch_note.assert_called_once()

    def _event(self, *, kind: FeedEventKind) -> ScrapedFeedEvent:
        return ScrapedFeedEvent(
            source=FeedSource.STEAM,
            kind=kind,
            external_id="event-2",
            game_tag="counter-strike-2",
            title="Test",
            plain_text="Sample update text.",
            published_at=datetime(2026, 7, 5, tzinfo=timezone.utc),
        )


if __name__ == "__main__":
    unittest.main()
