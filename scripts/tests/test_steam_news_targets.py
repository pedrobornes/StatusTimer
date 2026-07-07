"""Tests for dynamic Steam news target resolution."""

import unittest
from unittest.mock import patch

from scrapers.steam_news import SteamNewsTarget, build_steam_news_targets
from scrapers.twitch_top_games import TwitchTopGameEntry


class BuildSteamNewsTargetsTests(unittest.TestCase):
    @patch("scrapers.steam_news.fetch_twitch_top_games")
    def test_prioritizes_twitch_top_games_with_known_steam_app_ids(self, mock_fetch) -> None:
        mock_fetch.return_value = [
            TwitchTopGameEntry(
                twitch_game_id="1",
                game_name="Counter-Strike",
                slug="counter-strike",
                twitch_rank=1,
                twitch_viewers=100_000,
            ),
            TwitchTopGameEntry(
                twitch_game_id="2",
                game_name="Unknown Title",
                slug="unknown-title",
                twitch_rank=2,
                twitch_viewers=50_000,
            ),
        ]

        targets = build_steam_news_targets(limit=5)

        self.assertGreaterEqual(len(targets), 1)
        self.assertEqual(targets[0].game_tag, "counter-strike-2")
        self.assertEqual(targets[0].app_id, 730)

    @patch("scrapers.steam_news.fetch_twitch_top_games")
    def test_falls_back_to_monitored_catalog_when_twitch_is_empty(self, mock_fetch) -> None:
        mock_fetch.return_value = []

        targets = build_steam_news_targets(limit=3)

        self.assertEqual(len(targets), 3)
        self.assertTrue(all(isinstance(target, SteamNewsTarget) for target in targets))


if __name__ == "__main__":
    unittest.main()
