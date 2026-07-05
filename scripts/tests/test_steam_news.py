"""Tests for Steam RSS parsing."""

import unittest

from scrapers.steam_news import SteamNewsScraper


SAMPLE_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Steam News</title>
    <item>
      <title>Patch 1.2.3</title>
      <link>https://store.steampowered.com/news/app/730/view/123</link>
      <guid>steam-news-123</guid>
      <pubDate>Mon, 30 Jun 2025 12:00:00 +0000</pubDate>
      <description><![CDATA[<p>Balance changes for rifles.</p>]]></description>
    </item>
  </channel>
</rss>
"""


class SteamNewsScraperTests(unittest.TestCase):
    def test_parse_rss_xml_extracts_plain_text_and_metadata(self) -> None:
        scraper = SteamNewsScraper()
        events = scraper.parse_rss_xml(
            SAMPLE_RSS,
            game_tag="counter-strike-2",
            game_name="Counter-Strike 2",
            app_id=730,
        )

        self.assertEqual(len(events), 1)
        event = events[0]
        self.assertEqual(event.external_id, "steam-news-123")
        self.assertIn("Balance changes for rifles.", event.plain_text)
        self.assertEqual(event.game_tag, "counter-strike-2")
        self.assertTrue(event.title.startswith("[STEAM NEWS]"))


if __name__ == "__main__":
    unittest.main()
