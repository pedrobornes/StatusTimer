"""Tests for Twitch top games harvester parsing and pagination."""

import unittest
from unittest.mock import MagicMock, patch

from scrapers.twitch_top_games import (
    fetch_twitch_top_games,
    is_non_game_category,
    parse_twitch_top_game,
    resolve_twitch_cover_url,
    resolve_twitch_logo_url,
)


class TwitchTopGamesTests(unittest.TestCase):
    def test_is_non_game_category_matches_known_sections(self) -> None:
        self.assertTrue(is_non_game_category("Just Chatting"))
        self.assertTrue(is_non_game_category("ASMR"))
        self.assertFalse(is_non_game_category("VALORANT"))

    def test_resolve_twitch_box_art_urls(self) -> None:
        template = "https://static-cdn.jtvnw.net/ttv-boxart/509658-{width}x{height}.jpg"

        self.assertEqual(
            resolve_twitch_logo_url(template),
            "https://static-cdn.jtvnw.net/ttv-boxart/509658-285x380.jpg",
        )
        self.assertEqual(
            resolve_twitch_cover_url(template),
            "https://static-cdn.jtvnw.net/ttv-boxart/509658-600x800.jpg",
        )

    def test_parse_twitch_top_game_builds_ranked_entry(self) -> None:
        entry = parse_twitch_top_game(
            {
                "id": "516575",
                "name": "Valorant",
                "box_art_url": (
                    "https://static-cdn.jtvnw.net/ttv-boxart/516575-{width}x{height}.jpg"
                ),
            },
            rank=3,
        )

        self.assertIsNotNone(entry)
        assert entry is not None
        self.assertEqual(entry.twitch_game_id, "516575")
        self.assertEqual(entry.game_name, "Valorant")
        self.assertEqual(entry.slug, "valorant")
        self.assertEqual(entry.twitch_rank, 3)
        self.assertIn("285x380", entry.logo_url)
        self.assertIn("600x800", entry.cover_url)

    def test_parse_twitch_top_game_rejects_non_game_category(self) -> None:
        entry = parse_twitch_top_game(
            {
                "id": "509658",
                "name": "Just Chatting",
                "box_art_url": "https://cdn.example/1-{width}x{height}.jpg",
            },
            rank=1,
        )

        self.assertIsNone(entry)

    @patch("scrapers.twitch_top_games.fetch_twitch_viewers")
    @patch("scrapers.twitch_top_games.get_twitch_access_token")
    @patch("scrapers.twitch_top_games._build_twitch_session")
    @patch("scrapers.twitch_top_games.settings")
    def test_fetch_twitch_top_games_skips_non_game_categories_and_reindexes_rank(
        self,
        settings_mock: MagicMock,
        build_session_mock: MagicMock,
        token_mock: MagicMock,
        viewers_mock: MagicMock,
    ) -> None:
        settings_mock.twitch_client_id = "client-id"
        settings_mock.twitch_client_secret = "client-secret"
        settings_mock.twitch_top_n = 3
        settings_mock.request_timeout_seconds = 15
        token_mock.return_value = "token-abc"
        viewers_mock.return_value = 42_000

        session = MagicMock()
        build_session_mock.return_value = session

        first_response = MagicMock()
        first_response.json.return_value = {
            "data": [
                {
                    "id": "1",
                    "name": "Just Chatting",
                    "box_art_url": "https://cdn.example/1-{width}x{height}.jpg",
                },
                {
                    "id": "2",
                    "name": "League of Legends",
                    "box_art_url": "https://cdn.example/2-{width}x{height}.jpg",
                },
            ],
            "pagination": {"cursor": "page-2"},
        }
        second_response = MagicMock()
        second_response.json.return_value = {
            "data": [
                {
                    "id": "3",
                    "name": "Valorant",
                    "box_art_url": "https://cdn.example/3-{width}x{height}.jpg",
                },
                {
                    "id": "4",
                    "name": "Counter-Strike",
                    "box_art_url": "https://cdn.example/4-{width}x{height}.jpg",
                },
            ],
            "pagination": {},
        }
        session.get.side_effect = [first_response, second_response]

        entries = fetch_twitch_top_games(limit=3)

        self.assertEqual(len(entries), 3)
        self.assertEqual(entries[0].twitch_rank, 1)
        self.assertEqual(entries[0].game_name, "League of Legends")
        self.assertEqual(entries[1].slug, "valorant")
        self.assertEqual(entries[1].twitch_rank, 2)
        self.assertEqual(entries[2].twitch_rank, 3)
        self.assertEqual(entries[0].twitch_viewers, 42_000)
        self.assertEqual(session.get.call_count, 2)
        self.assertEqual(viewers_mock.call_count, 3)

    @patch("scrapers.twitch_top_games.settings")
    def test_fetch_twitch_top_games_skips_without_credentials(
        self,
        settings_mock: MagicMock,
    ) -> None:
        settings_mock.twitch_client_id = ""
        settings_mock.twitch_client_secret = ""

        entries = fetch_twitch_top_games()

        self.assertEqual(entries, [])


if __name__ == "__main__":
    unittest.main()
