"""Tests for official Riot CMS news scraping."""

import json
import unittest
from unittest.mock import Mock, patch

from scrapers.riot_cms import (
    extract_listing_items,
    resolve_item_url,
)
from scrapers.riot_news import RiotNewsScraper, RIOT_NEWS_TARGETS


LISTING_PAGE = {
    "blades": [
        {
            "type": "articleCardGrid",
            "items": [
                {
                    "title": "League of Legends Patch 26.13 Notes",
                    "publishedAt": "2026-06-23T18:00:00.000Z",
                    "analytics": {"contentId": "patch-26-13.en-us"},
                    "description": {
                        "type": "html",
                        "body": "<p>Patch summary teaser.</p>",
                    },
                    "action": {
                        "type": "weblink",
                        "payload": {
                            "url": "/en-us/news/game-updates/league-of-legends-patch-26-13-notes",
                        },
                    },
                },
                {
                    "title": "Merch Drop",
                    "action": {
                        "type": "weblink",
                        "payload": {
                            "url": "https://merch.riotgames.com/product/test/",
                        },
                    },
                },
            ],
        }
    ]
}

ARTICLE_PAGE = {
    "title": "Patch 26.13 Notes",
    "blades": [
        {
            "type": "patchNotesRichText",
            "richText": {
                "type": "html",
                "body": "<p>Balance changes for multiple champions.</p>" * 20,
            },
        }
    ],
}


class RiotCmsTests(unittest.TestCase):
    def test_extract_listing_items(self) -> None:
        items = extract_listing_items(LISTING_PAGE)
        self.assertEqual(len(items), 2)

    def test_resolve_item_url_skips_merch(self) -> None:
        target = RIOT_NEWS_TARGETS[0]
        url = resolve_item_url(
            LISTING_PAGE["blades"][0]["items"][1],
            origin=target.origin,
            allowed_hosts=target.article_hosts,
        )
        self.assertIsNone(url)

    def test_resolve_item_url_accepts_relative_patch_link(self) -> None:
        target = RIOT_NEWS_TARGETS[0]
        url = resolve_item_url(
            LISTING_PAGE["blades"][0]["items"][0],
            origin=target.origin,
            allowed_hosts=target.article_hosts,
        )
        self.assertEqual(
            url,
            "https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-26-13-notes",
        )


class RiotNewsScraperTests(unittest.TestCase):
    @patch("scrapers.riot_news.fetch_next_page")
    def test_fetch_for_target_builds_news_event(self, mock_fetch) -> None:
        mock_fetch.side_effect = [LISTING_PAGE, ARTICLE_PAGE]
        scraper = RiotNewsScraper(session=Mock())
        events = scraper.fetch_for_target(RIOT_NEWS_TARGETS[0])

        self.assertEqual(len(events), 1)
        self.assertEqual(events[0].game_tag, "league-of-legends")
        self.assertIn("Balance changes", events[0].plain_text)
        self.assertEqual(events[0].external_id, "patch-26-13.en-us")


if __name__ == "__main__":
    unittest.main()
