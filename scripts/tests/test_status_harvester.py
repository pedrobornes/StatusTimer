"""Tests for multi-platform status harvester orchestration."""

import unittest
from unittest.mock import Mock, patch

from models.telemetry import TelemetrySource, TelemetryStatus
from scrapers.probe_models import ProbeOutcome
from scrapers.status import MONITORED_GAME_TARGETS, StatusHarvester


class StatusHarvesterTests(unittest.TestCase):
    def test_gta_vi_is_marked_as_skip_live_probe(self) -> None:
        gta = next(target for target in MONITORED_GAME_TARGETS if target.slug == "gta-vi")
        self.assertTrue(gta.skip_live_probe)

    @patch("scrapers.status.probe_tcp_latency", return_value=None)
    @patch("scrapers.status.probe_fortnite_status")
    @patch("scrapers.status.probe_valorant_status")
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

        analyzer = Mock()
        analyzer.resolve_probe.side_effect = lambda **kwargs: kwargs["outcome"]
        harvester = StatusHarvester(analyzer=analyzer)
        payloads = harvester.fetch_all()

        slugs = {entry.game_slug for entry in payloads}
        gta = next(entry for entry in payloads if entry.game_slug == "gta-vi")
        self.assertEqual(gta.status, TelemetryStatus.UPCOMING)
        self.assertTrue(gta.is_upcoming)
        self.assertNotIn("valorant", slugs)
        self.assertIn("counter-strike-2", slugs)
        self.assertIn("fortnite", slugs)


if __name__ == "__main__":
    unittest.main()
