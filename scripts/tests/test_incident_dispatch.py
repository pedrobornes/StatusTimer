"""Tests for deterministic incident dispatch."""

import unittest
from datetime import datetime, timezone
from unittest.mock import Mock

from clients.http_result import PushResult
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.incident_dispatch import dispatch_incident_event


class IncidentDispatchTests(unittest.TestCase):
    def test_incident_dispatches_status_and_news(self) -> None:
        client = Mock()
        client.sync_game_telemetry.return_value = PushResult(success=True, status_code=200)
        client.push_patch_note.return_value = PushResult(success=True, status_code=201)

        event = ScrapedFeedEvent(
            source=FeedSource.RIOT,
            kind=FeedEventKind.INCIDENT,
            external_id="riot-1",
            game_tag="valorant",
            title="Login Issues",
            plain_text="Players are unable to authenticate in NA.",
            published_at=datetime(2026, 7, 5, tzinfo=timezone.utc),
        )

        report = dispatch_incident_event(client, event)
        self.assertFalse(report.skipped)
        self.assertTrue(report.success)
        client.sync_game_telemetry.assert_called_once()
        client.push_patch_note.assert_called_once()

    def test_maintenance_incident_maps_to_maintenance_status(self) -> None:
        client = Mock()
        client.sync_game_telemetry.return_value = PushResult(success=True, status_code=200)
        client.push_patch_note.return_value = PushResult(success=True, status_code=201)

        event = ScrapedFeedEvent(
            source=FeedSource.RIOT,
            kind=FeedEventKind.INCIDENT,
            external_id="riot-2",
            game_tag="league-of-legends",
            title="Scheduled Maintenance",
            plain_text="Platform maintenance is in progress.",
            published_at=datetime(2026, 7, 5, tzinfo=timezone.utc),
        )

        dispatch_incident_event(client, event)
        telemetry_request = client.sync_game_telemetry.call_args.args[0]
        self.assertEqual(
            telemetry_request.entries[0].status.value,
            "MAINTENANCE",
        )

    def test_epic_games_slug_skips_telemetry_but_keeps_news(self) -> None:
        client = Mock()
        client.push_patch_note.return_value = PushResult(success=True, status_code=201)

        event = ScrapedFeedEvent(
            source=FeedSource.EPIC,
            kind=FeedEventKind.INCIDENT,
            external_id="epic-1",
            game_tag="epic-games",
            title="Epic Online Services outage",
            plain_text="Store unavailable.",
            published_at=datetime(2026, 7, 12, tzinfo=timezone.utc),
        )

        report = dispatch_incident_event(client, event)

        self.assertFalse(report.skipped)
        self.assertTrue(report.success)
        client.sync_game_telemetry.assert_not_called()
        client.push_patch_note.assert_called_once()
        self.assertIsNone(report.telemetry_push)


if __name__ == "__main__":
    unittest.main()
