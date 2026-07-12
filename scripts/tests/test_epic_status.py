"""Tests for Epic status page incident parsing."""

import unittest

from scrapers.epic_status import EpicStatusScraper, _resolve_game_tag


class EpicStatusScraperTests(unittest.TestCase):
    def test_resolve_game_tag_maps_known_titles(self) -> None:
        self.assertEqual(_resolve_game_tag("Fortnite outage", ""), "fortnite")
        self.assertEqual(_resolve_game_tag("Rocket League login", ""), "rocket-league")
        self.assertEqual(_resolve_game_tag("Fall Guys matchmaking", ""), "fall-guys")

    def test_resolve_game_tag_returns_none_for_generic_epic_incidents(self) -> None:
        self.assertIsNone(_resolve_game_tag("Epic Online Services outage", "Store unavailable"))

    def test_parse_incident_skips_unmapped_generic_incidents(self) -> None:
        scraper = EpicStatusScraper()
        parsed = scraper._parse_incident(
            {
                "id": "incident-1",
                "status": "investigating",
                "name": "Epic Online Services outage",
                "created_at": "2026-07-12T12:00:00Z",
                "incident_updates": [{"body": "<p>Store unavailable.</p>"}],
            }
        )

        self.assertIsNone(parsed)


if __name__ == "__main__":
    unittest.main()
