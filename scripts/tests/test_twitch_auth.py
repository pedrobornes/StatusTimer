"""Tests for Twitch OAuth token caching."""

import time
import unittest
from unittest.mock import MagicMock, patch

from scrapers import twitch_auth


class TwitchAuthTests(unittest.TestCase):
    def setUp(self) -> None:
        twitch_auth.clear_twitch_token_cache()

    def tearDown(self) -> None:
        twitch_auth.clear_twitch_token_cache()

    @patch("scrapers.twitch_auth.settings")
    @patch("scrapers.twitch_auth.requests.Session")
    def test_get_twitch_access_token_fetches_and_caches(
        self,
        session_cls: MagicMock,
        settings_mock: MagicMock,
    ) -> None:
        settings_mock.twitch_client_id = "client-id"
        settings_mock.twitch_client_secret = "client-secret"
        settings_mock.request_timeout_seconds = 15

        session = MagicMock()
        session_cls.return_value = session
        response = MagicMock()
        response.json.return_value = {
            "access_token": "token-abc",
            "expires_in": 3600,
            "token_type": "bearer",
        }
        session.post.return_value = response

        first = twitch_auth.get_twitch_access_token()
        second = twitch_auth.get_twitch_access_token()

        self.assertEqual(first, "token-abc")
        self.assertEqual(second, "token-abc")
        session.post.assert_called_once()

    @patch("scrapers.twitch_auth.settings")
    def test_get_twitch_access_token_requires_credentials(
        self,
        settings_mock: MagicMock,
    ) -> None:
        settings_mock.twitch_client_id = ""
        settings_mock.twitch_client_secret = ""

        with self.assertRaisesRegex(RuntimeError, "credentials are not configured"):
            twitch_auth.get_twitch_access_token()

    @patch("scrapers.twitch_auth.settings")
    @patch("scrapers.twitch_auth.requests.Session")
    def test_get_twitch_access_token_refreshes_before_expiry_buffer(
        self,
        session_cls: MagicMock,
        settings_mock: MagicMock,
    ) -> None:
        settings_mock.twitch_client_id = "client-id"
        settings_mock.twitch_client_secret = "client-secret"
        settings_mock.request_timeout_seconds = 15

        session = MagicMock()
        session_cls.return_value = session

        first_response = MagicMock()
        first_response.json.return_value = {
            "access_token": "token-1",
            "expires_in": 120,
        }
        second_response = MagicMock()
        second_response.json.return_value = {
            "access_token": "token-2",
            "expires_in": 3600,
        }
        session.post.side_effect = [first_response, second_response]

        with patch("scrapers.twitch_auth.time.time") as time_mock:
            time_mock.side_effect = [1_000.0, 1_000.0, 1_150.0, 1_150.0]
            first = twitch_auth.get_twitch_access_token()
            second = twitch_auth.get_twitch_access_token()

        self.assertEqual(first, "token-1")
        self.assertEqual(second, "token-2")
        self.assertEqual(session.post.call_count, 2)


if __name__ == "__main__":
    unittest.main()
