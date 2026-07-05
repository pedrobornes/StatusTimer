"""Tests for Steam structured probe parsing."""

import unittest
from unittest.mock import Mock, patch

from models.telemetry import TelemetrySource, TelemetryStatus
from scrapers.steam_probe import probe_steam_game


class SteamProbeTests(unittest.TestCase):
    def test_appdetails_success_maps_online(self) -> None:
        session = Mock()
        session.get.return_value = Mock(
            status_code=200,
            raise_for_status=Mock(),
            json=Mock(
                return_value={
                    "730": {
                        "success": True,
                        "data": {
                            "name": "Counter-Strike 2",
                            "release_date": {"coming_soon": False},
                        },
                    }
                }
            ),
        )

        outcome = probe_steam_game(
            app_id=730,
            display_name="Counter-Strike 2",
            session=session,
            timeout=5,
        )

        self.assertIsNotNone(outcome)
        assert outcome is not None
        self.assertEqual(outcome.status, TelemetryStatus.ONLINE)
        self.assertEqual(outcome.data_source, TelemetrySource.STEAM_API)

    def test_appdetails_failure_marks_maintenance(self) -> None:
        session = Mock()
        session.get.return_value = Mock(
            status_code=200,
            raise_for_status=Mock(),
            json=Mock(return_value={"730": {"success": False}}),
        )

        outcome = probe_steam_game(
            app_id=730,
            display_name="Counter-Strike 2",
            session=session,
            timeout=5,
        )

        self.assertIsNotNone(outcome)
        assert outcome is not None
        self.assertEqual(outcome.status, TelemetryStatus.MAINTENANCE)
        self.assertTrue(outcome.ambiguous)


if __name__ == "__main__":
    unittest.main()
