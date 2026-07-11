"""Tests for IGDB platform allowlist used during catalog ingestion."""

import unittest

from scrapers.igdb_platforms import has_supported_igdb_platform, is_eligible_for_igdb_discovery


class IgdbPlatformFilterTests(unittest.TestCase):
    def test_accepts_pc_only(self) -> None:
        self.assertTrue(has_supported_igdb_platform([6]))

    def test_accepts_switch_plus_pc(self) -> None:
        self.assertTrue(has_supported_igdb_platform([130, 6]))

    def test_rejects_switch_only(self) -> None:
        self.assertFalse(has_supported_igdb_platform([130]))

    def test_rejects_game_boy_only(self) -> None:
        self.assertFalse(has_supported_igdb_platform([33]))

    def test_rejects_empty_or_missing_for_strict_check(self) -> None:
        self.assertFalse(has_supported_igdb_platform([]))
        self.assertFalse(has_supported_igdb_platform(None))

    def test_accepts_empty_or_missing_for_discovery(self) -> None:
        self.assertTrue(is_eligible_for_igdb_discovery([]))
        self.assertTrue(is_eligible_for_igdb_discovery(None))

    def test_rejects_switch_only_for_discovery(self) -> None:
        self.assertFalse(is_eligible_for_igdb_discovery([130]))


if __name__ == "__main__":
    unittest.main()
