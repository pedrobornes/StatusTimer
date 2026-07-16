"""Tests for scheduled metrics completion rules."""

import unittest
from unittest.mock import MagicMock, patch

from scrapers import scheduled_harvest


class ScheduledMetricsSuccessTests(unittest.TestCase):
    @patch("scrapers.scheduled_harvest.resolve_harvest_steam_app_id", return_value=4210580)
    def test_steam_backed_target_requires_steam_success(self, _resolve: MagicMock) -> None:
        target = {"slug": "ore-factory-squad", "steamAppId": 4210580}

        self.assertFalse(
            scheduled_harvest._metrics_target_succeeded(
                target,
                steam_successes=set(),
                twitch_successes={"ore-factory-squad"},
            )
        )
        self.assertTrue(
            scheduled_harvest._metrics_target_succeeded(
                target,
                steam_successes={"ore-factory-squad"},
                twitch_successes={"ore-factory-squad"},
            )
        )

    @patch("scrapers.scheduled_harvest.resolve_harvest_steam_app_id", return_value=None)
    def test_twitch_only_target_can_succeed_without_steam(self, _resolve: MagicMock) -> None:
        target = {"slug": "valorant", "steamAppId": None}

        self.assertTrue(
            scheduled_harvest._metrics_target_succeeded(
                target,
                steam_successes=set(),
                twitch_successes={"valorant"},
            )
        )


if __name__ == "__main__":
    unittest.main()
