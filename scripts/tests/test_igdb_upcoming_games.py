"""Tests for IGDB upcoming-release query and pagination."""

import unittest
from unittest.mock import MagicMock, patch

from clients.igdb_client import IGDB_MAX_PAGE_SIZE, IgdbClient


class IgdbUpcomingGamesTests(unittest.TestCase):
    @patch("clients.igdb_client.IgdbClient._post")
    @patch("clients.igdb_client.is_igdb_configured", return_value=True)
    def test_upcoming_query_paginates_above_page_size(
        self,
        _configured: MagicMock,
        post_mock: MagicMock,
    ) -> None:
        first_page = [{"id": index, "name": f"Game {index}", "category": 0} for index in range(IGDB_MAX_PAGE_SIZE)]
        second_page = [{"id": 999, "name": "Final Game", "category": 0}]
        post_mock.side_effect = [first_page, second_page]

        client = IgdbClient()
        rows = client.fetch_upcoming_games(limit=IGDB_MAX_PAGE_SIZE + 1, min_hype=3)

        self.assertEqual(len(rows), IGDB_MAX_PAGE_SIZE + 1)
        self.assertEqual(post_mock.call_count, 2)

        first_query = post_mock.call_args_list[0][0][1]
        second_query = post_mock.call_args_list[1][0][1]
        self.assertIn("sort hypes desc;", first_query)
        self.assertIn("hypes >= 3", first_query)
        self.assertIn(f"limit {IGDB_MAX_PAGE_SIZE};", first_query)
        self.assertIn("offset 0;", first_query)
        self.assertIn("offset 50;", second_query)

    @patch("clients.igdb_client.IgdbClient._post")
    @patch("clients.igdb_client.is_igdb_configured", return_value=True)
    def test_upcoming_query_returns_empty_when_not_configured(
        self,
        configured_mock: MagicMock,
        post_mock: MagicMock,
    ) -> None:
        configured_mock.return_value = False

        client = IgdbClient()
        rows = client.fetch_upcoming_games(limit=100)

        self.assertEqual(rows, [])
        post_mock.assert_not_called()


if __name__ == "__main__":
    unittest.main()
