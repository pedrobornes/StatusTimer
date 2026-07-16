"""Tests for Riot developer status API parsing."""

import unittest

from scrapers.riot_status import RiotStatusScraper, RiotStatusTarget


class RiotStatusScraperTests(unittest.TestCase):
    def test_parse_platform_payload_extracts_incident_plain_text(self) -> None:
        payload = {
            "incidents": [
                {
                    "id": 991,
                    "name": "Login issues",
                    "created_at": 1_752_000_000_000,
                    "updates": [
                        {
                            "content": "<p>Investigating elevated login failures.</p>",
                            "created_at": 1_752_000_100_000,
                        }
                    ],
                }
            ],
            "maintenances": [],
        }
        target = RiotStatusTarget(
            "https://na.api.riotgames.com/val/status/v1/platform-data",
            "valorant",
            "Valorant",
        )

        scraper = RiotStatusScraper()
        events = scraper._parse_platform_payload(payload, target)

        self.assertEqual(len(events), 1)
        self.assertIn("Investigating elevated login failures.", events[0].plain_text)
        self.assertEqual(events[0].game_tag, "valorant")

    def test_parse_platform_payload_skips_scheduled_maintenance(self) -> None:
        payload = {
            "incidents": [],
            "maintenances": [
                {
                    "id": 55,
                    "name": "Patch Maintenance",
                    "maintenance_status": "scheduled",
                    "created_at": 1_752_000_000_000,
                    "updates": [
                        {
                            "content": "<p>Patch maintenance is scheduled.</p>",
                            "created_at": 1_752_000_100_000,
                        }
                    ],
                }
            ],
        }
        target = RiotStatusTarget(
            "https://na1.api.riotgames.com/lol/status/v4/platform-data",
            "league-of-legends",
            "League of Legends",
        )

        scraper = RiotStatusScraper()
        events = scraper._parse_platform_payload(payload, target)

        self.assertEqual(events, [])


if __name__ == "__main__":
    unittest.main()
