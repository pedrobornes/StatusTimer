"""Tests for IGDB popular-games query and pagination."""

import unittest
from unittest.mock import MagicMock, patch

from clients.igdb_client import IGDB_MAX_PAGE_SIZE, IgdbClient


class IgdbPopularGamesTests(unittest.TestCase):
    @patch("clients.igdb_client.IgdbClient._post")
    @patch("clients.igdb_client.is_igdb_configured", return_value=True)
    def test_popular_query_uses_single_sort_field(self, _configured: MagicMock, post_mock: MagicMock) -> None:
        post_mock.return_value = [{"id": 1, "name": "Rust", "category": 0}]

        client = IgdbClient()
        client.fetch_popular_right_now_games(limit=10)

        query = post_mock.call_args[0][1]
        self.assertIn("sort total_rating_count desc;", query)
        self.assertNotIn("total_rating desc", query)

    @patch("clients.igdb_client.IgdbClient._post")
    @patch("clients.igdb_client.is_igdb_configured", return_value=True)
    def test_popular_query_paginates_above_page_size(
        self,
        _configured: MagicMock,
        post_mock: MagicMock,
    ) -> None:
        first_page = [{"id": index, "name": f"Game {index}", "category": 0} for index in range(IGDB_MAX_PAGE_SIZE)]
        second_page = [{"id": 999, "name": "Final Game", "category": 0}]
        post_mock.side_effect = [first_page, second_page]

        client = IgdbClient()
        rows = client.fetch_popular_right_now_games(limit=IGDB_MAX_PAGE_SIZE + 1)

        self.assertEqual(len(rows), IGDB_MAX_PAGE_SIZE + 1)
        self.assertEqual(post_mock.call_count, 2)

        first_query = post_mock.call_args_list[0][0][1]
        second_query = post_mock.call_args_list[1][0][1]
        self.assertIn(f"limit {IGDB_MAX_PAGE_SIZE};", first_query)
        self.assertIn("offset 0;", first_query)
        self.assertIn("offset 50;", second_query)


if __name__ == "__main__":
    unittest.main()
