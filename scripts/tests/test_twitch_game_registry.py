"""Tests for Twitch category name resolution."""

import unittest
from dataclasses import dataclass

from config.twitch_game_registry import resolve_twitch_lookup_name


@dataclass
class _Target:
    slug: str
    display_name: str


class TwitchGameRegistryTests(unittest.TestCase):
    def test_resolve_twitch_lookup_name_maps_sea_of_thieves(self) -> None:
        self.assertEqual(
            "Sea of Thieves",
            resolve_twitch_lookup_name(_Target("sea-of-thieves", "Sea of Thieves")),
        )

    def test_resolve_twitch_lookup_name_maps_sea_of_thieves_edition_skus(self) -> None:
        self.assertEqual(
            "Sea of Thieves",
            resolve_twitch_lookup_name(
                _Target(
                    "sea-of-thieves-deluxe-edition",
                    "Sea of Thieves Deluxe Edition",
                )
            ),
        )


if __name__ == "__main__":
    unittest.main()
