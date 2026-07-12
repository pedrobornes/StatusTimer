"""Tests for automatic tier trend rebalancing."""

import tempfile
import unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch

from pipeline.tier_trends import (
    TierTrendDecision,
    apply_tier_rebalance,
    calculate_tier_trends,
    classify_scrape_tier,
    should_run_tier_rebalance,
)
from scrapers.status import (
    ALWAYS_TIER_1,
    TIER_HIGH,
    TIER_LOW,
    TIER_MEDIUM,
    resolve_effective_scrape_tier,
)


class TierTrendsTests(unittest.TestCase):
    def test_always_tier_one_overrides_trend_and_db(self) -> None:
        self.assertIn("valorant", ALWAYS_TIER_1)
        self.assertIn("league-of-legends", ALWAYS_TIER_1)
        self.assertEqual(resolve_effective_scrape_tier("valorant", db_tier=3), TIER_HIGH)
        self.assertEqual(
            resolve_effective_scrape_tier("league-of-legends", db_tier=3),
            TIER_HIGH,
        )
        self.assertEqual(
            resolve_effective_scrape_tier("minecraft", db_tier=3, current_rank=80),
            TIER_LOW,
        )

    def test_classify_scrape_tier_buckets_by_current_rank(self) -> None:
        self.assertEqual(classify_scrape_tier("minecraft", current_rank=15), TIER_MEDIUM)
        self.assertEqual(classify_scrape_tier("minecraft", current_rank=35), TIER_MEDIUM)
        self.assertEqual(classify_scrape_tier("minecraft", current_rank=72), TIER_LOW)
        self.assertEqual(
            classify_scrape_tier("minecraft", current_rank=72, trend_promoted=True),
            TIER_HIGH,
        )
        self.assertEqual(classify_scrape_tier("valorant", current_rank=99), TIER_HIGH)

    @patch("pipeline.tier_trends.is_trend_promoted_tier1", return_value=True)
    def test_trend_promotion_returns_tier_one(self, _promoted_mock) -> None:
        self.assertEqual(resolve_effective_scrape_tier("minecraft", db_tier=3), TIER_HIGH)

    def test_calculate_tier_trends_promotes_consistent_top20(self) -> None:
        today = date(2026, 7, 7)
        history = {
            "2026-07-05": {"minecraft": 10, "elden-ring": 80},
            "2026-07-06": {"minecraft": 12, "elden-ring": 90},
            "2026-07-07": {"minecraft": 8, "elden-ring": 70},
        }
        state = {"trend_promotions": {}}

        with patch("pipeline.tier_trends._load_json") as load_mock:
            def _load(path: Path) -> dict:
                if path.name == "tier_rank_history.json":
                    return history
                return state

            load_mock.side_effect = _load
            decision = calculate_tier_trends(today=today, lookback_days=3)

        self.assertEqual(decision.promotions, ("minecraft",))
        self.assertEqual(decision.demotions, ())

    def test_calculate_tier_trends_demotes_fallen_trend_tier_one(self) -> None:
        today = date(2026, 7, 7)
        history = {
            "2026-07-05": {"minecraft": 60},
            "2026-07-06": {"minecraft": 70},
            "2026-07-07": {"minecraft": 80},
        }
        state = {
            "trend_promotions": {
                "minecraft": (today + timedelta(days=3)).isoformat(),
            }
        }

        with patch("pipeline.tier_trends._load_json") as load_mock:
            def _load(path: Path) -> dict:
                if path.name == "tier_rank_history.json":
                    return history
                return state

            load_mock.side_effect = _load
            decision = calculate_tier_trends(today=today, lookback_days=3)

        self.assertEqual(decision.promotions, ())
        self.assertEqual(decision.demotions, ("minecraft",))

    def test_should_run_tier_rebalance_on_monday(self) -> None:
        monday = date(2026, 7, 6)
        state = {"last_rebalance_date": "2026-07-05"}

        with patch("pipeline.tier_trends._load_json", return_value=state):
            with patch("pipeline.tier_trends.settings") as settings_mock:
                settings_mock.tier_rebalance_interval_days = 3
                settings_mock.tier_rebalance_force_monday = True
                self.assertTrue(should_run_tier_rebalance(today=monday))

    def test_apply_tier_rebalance_skips_when_interval_not_elapsed(self) -> None:
        today = date(2026, 7, 8)
        state = {"last_rebalance_date": today.isoformat()}

        with tempfile.TemporaryDirectory() as temp_dir:
            state_path = Path(temp_dir) / "tier_trend_state.json"
            state_path.write_text('{"last_rebalance_date": "2026-07-08"}', encoding="utf-8")

            with patch("pipeline.tier_trends._state_path", return_value=state_path):
                with patch(
                    "pipeline.tier_trends.sync_scrape_tiers_from_current_ranks",
                    return_value=(0, {"tier_1_high": 1, "tier_2_medium": 2, "tier_3_low": 3}),
                ):
                    with patch("pipeline.tier_trends.enforce_always_tier_one_slugs", return_value=2):
                        with patch("pipeline.tier_trends.settings") as settings_mock:
                            settings_mock.tier_rebalance_interval_days = 3
                            settings_mock.tier_rebalance_force_monday = False
                            report = apply_tier_rebalance(today=today)

        self.assertFalse(report.ran)
        self.assertEqual(report.reason, "interval_not_elapsed")


if __name__ == "__main__":
    unittest.main()
