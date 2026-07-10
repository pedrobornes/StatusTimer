"""Tests for official Blizzard news scraping."""

import unittest
from unittest.mock import Mock, patch

from scrapers.blizzard_news import (
    BlizzardNewsScraper,
    BLIZZARD_NEWS_TARGETS,
    _extract_feed_items,
    _extract_json_ld,
    resolve_blizzard_news_target,
)

FEED_PAYLOAD = {
    "contentItems": [
        {
            "contentId": "blt-test",
            "properties": {
                "title": "36.0 Patch Notes",
                "newsId": 24287640,
                "newsUrl": "https://news.blizzard.com/en-us/article/24287640/36-0-patch-notes",
                "lastUpdated": "2026-06-11T17:00:00Z",
            },
        }
    ]
}

ARTICLE_HTML = """
<script type="application/ld+json">{
  "@type": "NewsArticle",
  "headline": "36.0 Patch Notes",
  "datePublished": "2026-06-11T17:00:00+00:00",
  "image": ["https://bnetcmsus-a.akamaihd.net/cms/blog_header/example.jpg"]
}</script>
<h2>Balance Updates</h2><p>Card changes are live across Standard and Battlegrounds modes with ranked ladder updates.</p><p>More details here for players including new cards, balance changes, and bug fixes across all platforms.</p>
"""


class BlizzardNewsTests(unittest.TestCase):
    def test_extract_feed_items(self) -> None:
        items = _extract_feed_items(FEED_PAYLOAD)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["newsId"], 24287640)

    def test_extract_json_ld(self) -> None:
        metadata = _extract_json_ld(ARTICLE_HTML)
        self.assertEqual(metadata.get("headline"), "36.0 Patch Notes")

    def test_resolve_target_aliases(self) -> None:
        self.assertEqual(resolve_blizzard_news_target("overwatch-2").game_tag, "overwatch")
        self.assertEqual(resolve_blizzard_news_target("diablo-iv").game_tag, "diablo-4")
        self.assertIsNone(resolve_blizzard_news_target("fortnite"))

    @patch("scrapers.blizzard_news.fetch_text")
    @patch("scrapers.blizzard_news.fetch_json")
    def test_fetch_for_target_builds_news_event(
        self,
        mock_fetch_json,
        mock_fetch_text,
    ) -> None:
        mock_fetch_json.return_value = FEED_PAYLOAD
        mock_fetch_text.return_value = ARTICLE_HTML

        hearthstone_target = next(
            target for target in BLIZZARD_NEWS_TARGETS if target.game_tag == "hearthstone"
        )
        scraper = BlizzardNewsScraper(session=Mock())
        events = scraper.fetch_for_target(hearthstone_target)

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].game_tag, "hearthstone")
        self.assertEqual(events[0].external_id, "hearthstone-news-24287640")
        self.assertIn("Balance Updates", events[0].plain_text)


if __name__ == "__main__":
    unittest.main()
