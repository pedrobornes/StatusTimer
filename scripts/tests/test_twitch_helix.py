"""Tests for Twitch Helix rate control helpers."""

import time
import unittest
from unittest.mock import MagicMock, patch

from scrapers.twitch_helix import (
    TwitchHelixGuard,
    helix_get,
    prioritize_by_tier,
    prioritize_workload_targets,
    run_twitch_batched,
    should_enrich_twitch_viewers_for_rank,
    twitch_guard,
)


class TwitchHelixTests(unittest.TestCase):
    def setUp(self) -> None:
        twitch_guard.reset()

    def tearDown(self) -> None:
        twitch_guard.reset()

    def test_circuit_opens_immediately_on_rate_limit(self) -> None:
        guard = TwitchHelixGuard()
        guard.record_rate_limit()
        self.assertTrue(guard.is_open())

    def test_circuit_closes_after_cooldown(self) -> None:
        guard = TwitchHelixGuard()
        with patch("scrapers.twitch_helix.settings") as settings_mock:
            settings_mock.twitch_circuit_open_seconds = 0.05
            guard.record_rate_limit()
            self.assertTrue(guard.is_open())
            time.sleep(0.06)
            self.assertFalse(guard.is_open())

    @patch("scrapers.twitch_helix.settings")
    def test_run_twitch_batched_processes_in_small_groups(self, settings_mock: MagicMock) -> None:
        settings_mock.twitch_batch_size = 2
        settings_mock.twitch_batch_pause_seconds = 0

        calls: list[int] = []

        def worker(value: int) -> int:
            calls.append(value)
            return value * 2

        results = run_twitch_batched([1, 2, 3, 4, 5], worker)

        self.assertEqual(results, [2, 4, 6, 8, 10])
        self.assertEqual(calls, [1, 2, 3, 4, 5])

    @patch("scrapers.twitch_helix.settings")
    def test_run_twitch_batched_stops_when_circuit_is_open(self, settings_mock: MagicMock) -> None:
        settings_mock.twitch_batch_size = 2
        settings_mock.twitch_batch_pause_seconds = 0
        settings_mock.twitch_circuit_open_seconds = 600
        twitch_guard.record_rate_limit()

        results = run_twitch_batched([1, 2, 3], lambda value: value)

        self.assertEqual(results, [None, None, None])

    def test_prioritize_workload_targets_orders_by_tier(self) -> None:
        targets = [
            {"slug": "low", "scrapeTier": 3},
            {"slug": "top", "scrapeTier": 1},
            {"slug": "mid", "scrapeTier": 2},
        ]

        ordered = prioritize_workload_targets(targets)

        self.assertEqual([target["slug"] for target in ordered], ["top", "mid", "low"])

    @patch("scrapers.twitch_helix.settings")
    def test_prioritize_by_tier_caps_tier_three(self, settings_mock: MagicMock) -> None:
        settings_mock.twitch_metrics_max_tier3_per_cycle = 1
        items = [
            {"slug": "a", "tier": 3},
            {"slug": "b", "tier": 3},
            {"slug": "c", "tier": 1},
        ]

        ordered = prioritize_by_tier(
            items,
            tier_getter=lambda item: item["tier"],
        )

        self.assertEqual([item["slug"] for item in ordered], ["c", "a"])

    @patch("scrapers.twitch_helix.settings")
    def test_should_enrich_viewers_for_tier_ranks(self, settings_mock: MagicMock) -> None:
        settings_mock.twitch_viewer_enrich_tier1_max_rank = 10
        settings_mock.twitch_viewer_enrich_tier2_max_rank = 20

        self.assertTrue(should_enrich_twitch_viewers_for_rank(5))
        self.assertTrue(should_enrich_twitch_viewers_for_rank(15))
        self.assertFalse(should_enrich_twitch_viewers_for_rank(30))

    @patch("scrapers.twitch_helix.twitch_guard")
    def test_helix_get_records_rate_limit(self, guard_mock: MagicMock) -> None:
        guard_mock.check_available.return_value = True
        session = MagicMock()
        response = MagicMock()
        response.status_code = 429
        session.request.return_value = response

        result = helix_get(session, "https://api.twitch.tv/helix/streams")

        self.assertIsNone(result)
        guard_mock.record_rate_limit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
