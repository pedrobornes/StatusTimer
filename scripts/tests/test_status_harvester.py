"""Tests for multi-platform status harvester orchestration."""

import unittest
from unittest.mock import Mock, patch

from models.telemetry import TelemetrySource, TelemetryStatus
from scrapers.probe_models import ProbeOutcome
from scrapers.status import MONITORED_GAME_TARGETS, StatusHarvester


class StatusHarvesterTests(unittest.TestCase):
    def test_monitored_targets_do_not_include_unreleased_placeholders(self) -> None:
        slugs = {target.slug for target in MONITORED_GAME_TARGETS}
        self.assertNotIn("gta-vi", slugs)

    def test_monitored_targets_include_teamfight_tactics(self) -> None:
        slugs = {target.slug for target in MONITORED_GAME_TARGETS}
        self.assertIn("teamfight-tactics", slugs)

    @patch("scrapers.status.probe_riot_game_status")
    def test_fetch_telemetry_for_teamfight_tactics(self, mock_riot: Mock) -> None:
        from scrapers.status import fetch_telemetry_for_slug

        mock_riot.return_value = ProbeOutcome(
            status=TelemetryStatus.ONLINE,
            latency_ms=42,
            data_source=TelemetrySource.STATUS_PAGE,
        )

        payload = fetch_telemetry_for_slug("teamfight-tactics", display_name="Teamfight Tactics")

        self.assertIsNotNone(payload)
        assert payload is not None
        self.assertEqual(payload.game_slug, "teamfight-tactics")
        self.assertEqual(payload.status, TelemetryStatus.ONLINE)
        mock_riot.assert_called_once()

    @patch("scrapers.status.probe_tcp_latency", return_value=None)
    @patch("scrapers.status.probe_fortnite_status")
    @patch("scrapers.status.probe_riot_game_status")
    @patch("scrapers.status.probe_steam_game")
    def test_failed_probe_is_omitted_from_payload(
        self,
        mock_steam: Mock,
        mock_riot: Mock,
        mock_fortnite: Mock,
        _mock_tcp: Mock,
    ) -> None:
        mock_steam.return_value = ProbeOutcome(
            status=TelemetryStatus.ONLINE,
            latency_ms=20,
            data_source=TelemetrySource.STEAM_API,
        )
        mock_riot.return_value = None
        mock_fortnite.return_value = ProbeOutcome(
            status=TelemetryStatus.ONLINE,
            latency_ms=30,
            data_source=TelemetrySource.STATUS_PAGE,
        )

        harvester = StatusHarvester()
        payloads = harvester.fetch_all()

        slugs = {entry.game_slug for entry in payloads}
        self.assertNotIn("valorant", slugs)
        self.assertIn("counter-strike-2", slugs)
        self.assertIn("fortnite", slugs)


if __name__ == "__main__":
    unittest.main()
