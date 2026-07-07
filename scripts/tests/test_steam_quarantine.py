"""Tests for Steam AppID quarantine behavior."""

import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from pipeline.steam_quarantine import (
    record_steam_app_404,
    record_steam_app_success,
    should_skip_steam_app,
)


class SteamQuarantineTests(unittest.TestCase):
    @patch("pipeline.steam_quarantine.get_engine")
    def test_should_skip_blacklisted_before_rescan(self, engine_mock: MagicMock) -> None:
        connection = MagicMock()
        connection.__enter__.return_value = connection
        connection.execute.return_value.mappings.return_value.first.return_value = {
            "steam_blacklisted": True,
            "steam_blacklist_rescan_at": datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=3),
        }
        engine_mock.return_value.connect.return_value = connection

        self.assertTrue(should_skip_steam_app(1422450))

    @patch("pipeline.steam_quarantine.get_engine")
    def test_should_not_skip_when_rescan_due(self, engine_mock: MagicMock) -> None:
        connection = MagicMock()
        connection.__enter__.return_value = connection
        connection.execute.return_value.mappings.return_value.first.return_value = {
            "steam_blacklisted": True,
            "steam_blacklist_rescan_at": datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1),
        }
        engine_mock.return_value.connect.return_value = connection

        self.assertFalse(should_skip_steam_app(1422450))

    @patch("pipeline.steam_quarantine.get_engine")
    def test_record_success_resets_counters(self, engine_mock: MagicMock) -> None:
        connection = MagicMock()
        connection.__enter__.return_value = connection
        connection.execute.return_value.rowcount = 1
        engine_mock.return_value.begin.return_value = connection

        record_steam_app_success(1422450)

        sql = str(connection.execute.call_args[0][0])
        self.assertIn("steam_consecutive_404_count = 0", sql)
        self.assertIn("steam_blacklisted = 0", sql)

    @patch("pipeline.steam_quarantine.get_engine")
    def test_record_404_increments_counter(self, engine_mock: MagicMock) -> None:
        connection = MagicMock()
        connection.__enter__.return_value = connection
        connection.execute.side_effect = [
            MagicMock(rowcount=1),
            MagicMock(
                mappings=MagicMock(
                    return_value=MagicMock(
                        first=MagicMock(
                            return_value={
                                "steam_consecutive_404_count": 2,
                                "steam_blacklisted": False,
                            }
                        )
                    )
                )
            ),
        ]
        engine_mock.return_value.begin.return_value = connection

        record_steam_app_404(1422450)

        sql = str(connection.execute.call_args_list[0][0][0])
        self.assertIn("steam_consecutive_404_count = steam_consecutive_404_count + 1", sql)


if __name__ == "__main__":
    unittest.main()
