"""Tests for IGDB main-game category policy."""

import unittest
from unittest.mock import MagicMock, patch

from clients.igdb_client import IgdbClient
from scrapers.igdb_media import MAIN_GAME_CATEGORY, is_main_game, parse_igdb_game_metadata


class IgdbCategoryPolicyTests(unittest.TestCase):
    def test_is_main_game_accepts_category_zero(self) -> None:
        self.assertTrue(is_main_game({"name": "Rust", "category": 0}))

    def test_is_main_game_rejects_mod_category(self) -> None:
        self.assertFalse(is_main_game({"name": "Rust Mod", "category": 5}))

    def test_is_main_game_accepts_missing_legacy_fields(self) -> None:
        self.assertTrue(is_main_game({"name": "Legacy Game"}))

    def test_parse_metadata_rejects_mod_rows(self) -> None:
        with self.assertRaises(ValueError):
            parse_igdb_game_metadata({"name": "Rust Mod", "category": 5})

    @patch("clients.igdb_client.IgdbClient._post")
    @patch("clients.igdb_client.is_igdb_configured", return_value=True)
    def test_lookup_query_filters_main_games(
        self,
        _configured: MagicMock,
        post_mock: MagicMock,
    ) -> None:
        post_mock.return_value = [
            {
                "id": 252490,
                "name": "Rust",
                "slug": "rust",
                "category": 0,
                "cover": {"image_id": "coabc123"},
            }
        ]

        client = IgdbClient()
        metadata = client.lookup_game_metadata("Rust")

        self.assertIsNotNone(metadata)
        assert metadata is not None
        self.assertEqual(metadata.name, "Rust")

        query = post_mock.call_args[0][1]
        self.assertIn("category", query)
        self.assertIn("where game_type = (0,8,9,10,11);", query)
        self.assertIn('search "Rust";', query)


if __name__ == "__main__":
    unittest.main()
