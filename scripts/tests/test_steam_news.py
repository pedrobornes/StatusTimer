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
      <description><![CDATA[<p>Balance changes for rifles and SMGs, plus multiple stability fixes across competitive matchmaking, training modes, and community servers worldwide.</p>]]></description>
    </item>
  </channel>
</rss>
"""

RICH_RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Steam News</title>
    <item>
      <title>PUBG: BATTLEGROUNDS July Update</title>
      <guid>steam-news-update</guid>
      <pubDate>Mon, 30 Jun 2025 12:00:00 +0000</pubDate>
      <contents><![CDATA[
        <p>Intro paragraph with enough detail to pass the minimum content threshold for news ingestion.</p>
        <h2>What's New?</h2>
        <ul><li>Fixed an issue where players could not reconnect.</li></ul>
      ]]></contents>
    </item>
    <item>
      <title>Read the full announcement here!</title>
      <guid>steam-news-placeholder</guid>
      <pubDate>Mon, 30 Jun 2025 12:00:00 +0000</pubDate>
      <description><![CDATA[<p>Read the full announcement here!</p>]]></description>
    </item>
  </channel>
</rss>
"""


class SteamNewsScraperTests(unittest.TestCase):
    def test_parse_rss_xml_extracts_markdown_and_clean_title(self) -> None:
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
        self.assertIn("Balance changes for rifles and SMGs", event.plain_text)
        self.assertEqual(event.game_tag, "counter-strike-2")
        self.assertEqual(event.title, "Patch 1.2.3")
        self.assertNotIn("[STEAM NEWS]", event.title)

    def test_parse_rss_xml_skips_low_signal_survey_items(self) -> None:
        survey_rss = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Steam News</title>
    <item>
      <title>Battlefield 6 Steam Discussions Survey</title>
      <guid>steam-news-survey</guid>
      <pubDate>Mon, 30 Jun 2025 12:00:00 +0000</pubDate>
      <description><![CDATA[
        <p>Please take this 9-question survey about the Steam Discussions community space.
        Your feedback helps us improve how players connect and share feedback with the team.</p>
      ]]></description>
    </item>
  </channel>
</rss>
"""
        scraper = SteamNewsScraper()
        events = scraper.parse_rss_xml(
            survey_rss,
            game_tag="battlefield-6",
            game_name="Battlefield 6",
            app_id=2807960,
        )

        self.assertEqual(events, [])

    def test_parse_rss_xml_skips_placeholder_items_and_formats_sections(self) -> None:
        scraper = SteamNewsScraper()
        events = scraper.parse_rss_xml(
            RICH_RSS,
            game_tag="pubg",
            game_name="PUBG: Battlegrounds",
            app_id=578080,
        )

        self.assertEqual(len(events), 1)
        event = events[0]
        self.assertEqual(event.title, "July Update")
        self.assertIn("## What's New?", event.plain_text)
        self.assertIn("- Fixed an issue where players could not reconnect.", event.plain_text)


if __name__ == "__main__":
    unittest.main()
