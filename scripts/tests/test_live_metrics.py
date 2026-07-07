"""Tests for live metrics helpers."""

import unittest
from unittest.mock import MagicMock, patch

from scrapers.live_metrics import (
    fetch_monitored_twitch_live_metrics,
    fetch_steam_live_players,
    fetch_twitch_game_ids_by_names,
    fetch_twitch_viewers,
)


class LiveMetricsTests(unittest.TestCase):
    @patch("scrapers.live_metrics.settings")
    def test_fetch_steam_live_players_parses_player_count(
        self,
        settings_mock: MagicMock,
    ) -> None:
        settings_mock.steam_api_key = "test-key"
        settings_mock.request_timeout_seconds = 15

        session = MagicMock()
        response = MagicMock()
        response.json.return_value = {
            "response": {"result": 1, "player_count": 125430},
        }
        session.get.return_value = response

        self.assertEqual(fetch_steam_live_players(730, session), 125430)

    @patch("scrapers.live_metrics.helix_get")
    def test_fetch_twitch_viewers_sums_stream_counts(self, helix_mock: MagicMock) -> None:
        session = MagicMock()
        response = MagicMock()
        response.json.return_value = {
            "data": [
                {"viewer_count": 1200},
                {"viewer_count": 800},
            ],
            "pagination": {},
        }
        helix_mock.return_value = response

        self.assertEqual(fetch_twitch_viewers("516575", session), 2000)

    @patch("scrapers.live_metrics.helix_get")
    def test_fetch_twitch_game_ids_by_names_maps_categories(self, helix_mock: MagicMock) -> None:
        session = MagicMock()
        response = MagicMock()
        response.json.return_value = {
            "data": [
                {"id": "516575", "name": "VALORANT"},
                {"id": "33214", "name": "Fortnite"},
            ]
        }
        helix_mock.return_value = response

        resolved = fetch_twitch_game_ids_by_names(["Valorant", "Fortnite"], session)

        self.assertEqual(resolved["valorant"], "516575")
        self.assertEqual(resolved["fortnite"], "33214")

    @patch("scrapers.live_metrics.run_twitch_batched")
    @patch("scrapers.live_metrics.fetch_twitch_viewers")
    @patch("scrapers.live_metrics.fetch_twitch_game_ids_by_names")
    @patch("scrapers.twitch_auth.get_twitch_access_token")
    @patch("scrapers.live_metrics.settings")
    def test_fetch_monitored_twitch_live_metrics_builds_patches(
        self,
        settings_mock: MagicMock,
        token_mock: MagicMock,
        ids_mock: MagicMock,
        viewers_mock: MagicMock,
        batched_mock: MagicMock,
    ) -> None:
        settings_mock.twitch_client_id = "client-id"
        settings_mock.twitch_client_secret = "client-secret"
        settings_mock.request_timeout_seconds = 15
        token_mock.return_value = "token-abc"
        ids_mock.return_value = {"valorant": "516575", "fortnite": "33214"}
        viewers_mock.return_value = 99_000

        batched_mock.side_effect = lambda items, fn: [fn(item) for item in items]

        entries = fetch_monitored_twitch_live_metrics()
        slugs = {entry.slug for entry in entries}

        self.assertIn("valorant", slugs)
        self.assertIn("fortnite", slugs)
        self.assertNotIn("gta-vi", slugs)
        valorant = next(entry for entry in entries if entry.slug == "valorant")
        self.assertEqual(valorant.twitch_viewers, 99_000)
        self.assertEqual(valorant.twitch_game_id, "516575")
        self.assertGreaterEqual(ids_mock.call_count, 1)
        self.assertGreaterEqual(viewers_mock.call_count, 1)


if __name__ == "__main__":
    unittest.main()
