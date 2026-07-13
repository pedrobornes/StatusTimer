"""Tests for canonical slug and pinned Steam app resolution."""

import unittest

from config.game_slug_registry import (
    canonical_catalog_slug,
    normalize_catalog_slug,
    resolve_harvest_steam_app_id,
)


class GameSlugRegistryTests(unittest.TestCase):
    def test_normalize_catalog_slug_strips_trademark_suffix(self) -> None:
        self.assertEqual("apex-legends", normalize_catalog_slug("apex-legends-tm"))

    def test_normalize_catalog_slug_converts_roman_numeral_suffix(self) -> None:
        self.assertEqual("slay-the-spire-2", normalize_catalog_slug("slay-the-spire-ii"))

    def test_normalize_catalog_slug_preserves_single_letter_roman_suffixes(self) -> None:
        self.assertEqual("grand-theft-auto-v", normalize_catalog_slug("grand-theft-auto-v"))

    def test_canonical_catalog_slug_applies_explicit_aliases(self) -> None:
        self.assertEqual("counter-strike-2", canonical_catalog_slug("counter-strike"))
        self.assertEqual("diablo-4", canonical_catalog_slug("diablo-iv"))

    def test_resolve_harvest_steam_app_id_prefers_pinned_cs2(self) -> None:
        self.assertEqual(730, resolve_harvest_steam_app_id("counter-strike-2", 10))
        self.assertEqual(730, resolve_harvest_steam_app_id("counter-strike", 10))

    def test_resolve_harvest_steam_app_id_uses_monitored_target(self) -> None:
        self.assertEqual(570, resolve_harvest_steam_app_id("dota-2", None))

    def test_resolve_harvest_steam_app_id_falls_back_to_database(self) -> None:
        self.assertEqual(123456, resolve_harvest_steam_app_id("unknown-game", 123456))

    def test_resolve_harvest_steam_app_id_ignores_minecraft_legends(self) -> None:
        self.assertIsNone(resolve_harvest_steam_app_id("minecraft", 1928870))
        self.assertIsNone(resolve_harvest_steam_app_id("minecraft", None))


if __name__ == "__main__":
    unittest.main()
