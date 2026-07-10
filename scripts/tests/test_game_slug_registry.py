"""Tests for canonical slug and pinned Steam app resolution."""

import unittest

from config.game_slug_registry import resolve_harvest_steam_app_id


class GameSlugRegistryTests(unittest.TestCase):
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
