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

    def test_appdetails_coming_soon_maps_upcoming(self) -> None:
        session = Mock()
        session.get.return_value = Mock(
            status_code=200,
            raise_for_status=Mock(),
            json=Mock(
                return_value={
                    "3751260": {
                        "success": True,
                        "data": {
                            "name": "The Blood of Dawnwalker",
                            "release_date": {"coming_soon": True},
                        },
                    }
                }
            ),
        )

        outcome = probe_steam_game(
            app_id=3751260,
            display_name="The Blood of Dawnwalker",
            session=session,
            timeout=5,
        )

        self.assertIsNotNone(outcome)
        assert outcome is not None
        self.assertEqual(outcome.status, TelemetryStatus.UPCOMING)
        self.assertFalse(outcome.ambiguous)

    @patch("scrapers.steam_probe.settings")
    def test_appdetails_failure_returns_none(self, settings_mock: Mock) -> None:
        settings_mock.steam_api_key = None
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

        self.assertIsNone(outcome)


if __name__ == "__main__":
    unittest.main()
