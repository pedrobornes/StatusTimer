"""Tests for official Fortnite news scraping."""

import unittest
from datetime import datetime, timezone
from unittest.mock import Mock, patch

from scrapers.epic_news import (
    EpicNewsScraper,
    EPIC_NEWS_TARGETS,
    FORTNITE_CONTENT_PAGES,
    _ArticleCandidate,
    _MotdCandidate,
    _collect_fortnite_api_br_motd_candidates,
    _extract_official_article_slugs,
    _is_fortnite_blocked_page,
    _is_low_signal_title,
    _is_official_article_slug,
    _normalize_title_key,
    resolve_epic_news_target,
)

LISTING_HTML = """
<a href="/news/extract-and-collect-sprites-on-a-new-map-in-fortnite-runners">Runners</a>
<a href="/news/tag/all-news">All News</a>
<a href="https://www.reddit.com/r/FortniteBR/comments/abc">User post</a>
"""

ARTICLE_HTML = """
<script type="application/ld+json">{
  "@type": "NewsArticle",
  "headline": "Extract and Collect Sprites on a New Map in Fortnite: Runners",
  "datePublished": "2026-07-08T15:00:00+00:00",
  "articleBody": "Extract. Survive. Repeat! Choose a Sprite before each match for a Sprite Power, and rescue more during a match to build your Collection with new movement options.",
  "image": "https://cdn2.unrealengine.com/example.jpg"
}</script>
"""

MOTD_PAYLOAD = {
    "lastModified": "2026-07-10T13:00:00.000Z",
    "news": {
        "messages": [
            {
                "_type": "CommonUI Simple Message Base",
                "title": "Fortnite: Runners Is Here!",
                "body": (
                    "Extract. Survive. Repeat! Choose a Sprite before each match for a "
                    "Sprite Power, and rescue more during a match to build your Collection."
                ),
                "image": "https://cdn2.unrealengine.com/example.jpg",
                "hidden": False,
            }
        ]
    },
}

FORTNITE_API_BR_PAYLOAD = {
    "status": 200,
    "data": {
        "date": "2026-07-14T13:00:14Z",
        "motds": [
            {
                "id": "a782e43b2875f7b5c259b217ca103314",
                "title": "Fortnite: Runners Is Here!",
                "body": (
                    "Extract. Survive. Repeat! Choose a Sprite before each match for a "
                    "Sprite Power, and rescue more during a match to build your Collection."
                ),
                "image": "https://cdn2.unrealengine.com/example.jpg",
                "sortingPriority": 100,
                "hidden": False,
            }
        ],
    },
}


class EpicNewsTests(unittest.TestCase):
    def test_resolve_epic_news_target(self) -> None:
        self.assertEqual(resolve_epic_news_target("fortnite").game_tag, "fortnite")
        self.assertIsNone(resolve_epic_news_target("valorant"))

    def test_official_slug_filter(self) -> None:
        self.assertTrue(_is_official_article_slug("fortnite-runners-launch"))
        self.assertFalse(_is_official_article_slug("tag"))
        self.assertFalse(_is_official_article_slug("tag/all-news"))

    def test_extract_official_article_slugs(self) -> None:
        slugs = _extract_official_article_slugs(LISTING_HTML)
        self.assertEqual(slugs, ["extract-and-collect-sprites-on-a-new-map-in-fortnite-runners"])

    def test_blocked_page_detection(self) -> None:
        self.assertTrue(_is_fortnite_blocked_page("cf_challenge container", "https://www.fortnite.com/news"))
        self.assertFalse(_is_fortnite_blocked_page(LISTING_HTML, "https://www.fortnite.com/news?lang=en-US"))

    def test_low_signal_title_filter(self) -> None:
        self.assertTrue(_is_low_signal_title("Keep Your Account Secure"))
        self.assertFalse(_is_low_signal_title("Fortnite: Runners Is Here!"))

    def test_title_dedupe_key(self) -> None:
        self.assertEqual(
            _normalize_title_key("Fortnite: Runners Is Here!"),
            _normalize_title_key("Fortnite Runners Is Here"),
        )

    def test_legacy_content_pages_exclude_empty_battleroyalenewsv2(self) -> None:
        self.assertNotIn("fortnite-game/battleroyalenewsv2", FORTNITE_CONTENT_PAGES)

    @patch("scrapers.epic_news._collect_fortnite_site_articles")
    def test_fetch_prefers_site_articles_over_motds(self, mock_site_articles) -> None:
        mock_site_articles.return_value = [
            _ArticleCandidate(
                slug="fortnite-runners-launch",
                title="Fortnite: Runners Is Here!",
                body=(
                    "Extract. Survive. Repeat! Choose a Sprite before each match for a "
                    "Sprite Power, and rescue more during a match to build your Collection."
                ),
                image_url="https://cdn2.unrealengine.com/example.jpg",
                published_at=datetime(2026, 7, 8, 15, 0, tzinfo=timezone.utc),
                source_url="https://www.fortnite.com/news/fortnite-runners-launch?lang=en-US",
            )
        ]

        with patch("scrapers.epic_news._collect_fortnite_api_br_motd_candidates") as mock_api_motds:
            with patch("scrapers.epic_news._collect_legacy_epic_motd_candidates") as mock_legacy_motds:
                scraper = EpicNewsScraper(session=Mock())
                events = scraper.fetch_for_target(EPIC_NEWS_TARGETS[0])

        self.assertEqual(len(events), 1)
        self.assertTrue(events[0].external_id.startswith("fortnite-article-"))
        mock_api_motds.assert_not_called()
        mock_legacy_motds.assert_not_called()

    @patch("scrapers.epic_news._collect_fortnite_site_articles")
    @patch("scrapers.epic_news._collect_fortnite_api_br_motd_candidates")
    def test_fetch_falls_back_to_fortnite_api_when_site_unavailable(
        self,
        mock_api_motds,
        mock_site_articles,
    ) -> None:
        mock_site_articles.return_value = []
        mock_api_motds.return_value = [
            _MotdCandidate(
                title="Fortnite: Runners Is Here!",
                body=(
                    "Extract. Survive. Repeat! Choose a Sprite before each match for a "
                    "Sprite Power, and rescue more during a match to build your Collection."
                ),
                image_url="https://cdn2.unrealengine.com/example.jpg",
                published_at=datetime(2026, 7, 14, 13, 0, 14, tzinfo=timezone.utc),
                message_id="a782e43b2875f7b5c259b217ca103314",
            )
        ]

        with patch("scrapers.epic_news._collect_legacy_epic_motd_candidates") as mock_legacy_motds:
            scraper = EpicNewsScraper(session=Mock())
            events = scraper.fetch_for_target(EPIC_NEWS_TARGETS[0])

        self.assertEqual(len(events), 1)
        self.assertTrue(events[0].external_id.startswith("fortnite-motd-"))
        mock_legacy_motds.assert_not_called()

    @patch("scrapers.epic_news._collect_fortnite_site_articles")
    @patch("scrapers.epic_news._collect_fortnite_api_br_motd_candidates")
    @patch("scrapers.epic_news._collect_legacy_epic_motd_candidates")
    def test_fetch_falls_back_to_legacy_epic_content_when_api_unavailable(
        self,
        mock_legacy_motds,
        mock_api_motds,
        mock_site_articles,
    ) -> None:
        mock_site_articles.return_value = []
        mock_api_motds.return_value = []
        mock_legacy_motds.return_value = [
            _MotdCandidate(
                title="Fortnite: Runners Is Here!",
                body=(
                    "Extract. Survive. Repeat! Choose a Sprite before each match for a "
                    "Sprite Power, and rescue more during a match to build your Collection."
                ),
                image_url="https://cdn2.unrealengine.com/example.jpg",
                published_at=datetime(2026, 7, 10, 13, 0, tzinfo=timezone.utc),
                message_id="runners-launch",
            )
        ]

        scraper = EpicNewsScraper(session=Mock())
        events = scraper.fetch_for_target(EPIC_NEWS_TARGETS[0])

        self.assertEqual(len(events), 1)
        self.assertTrue(events[0].external_id.startswith("fortnite-motd-"))

    @patch("scrapers.epic_news.fetch_json")
    def test_collect_fortnite_api_br_motd_candidates(self, mock_fetch_json) -> None:
        mock_fetch_json.return_value = FORTNITE_API_BR_PAYLOAD

        candidates = _collect_fortnite_api_br_motd_candidates(Mock())

        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0].title, "Fortnite: Runners Is Here!")
        self.assertEqual(candidates[0].message_id, "a782e43b2875f7b5c259b217ca103314")

    @patch("scrapers.epic_news._parse_fortnite_article")
    @patch("scrapers.epic_news._fetch_fortnite_html")
    def test_site_fetch_skips_non_official_links(
        self,
        mock_fetch_html,
        mock_parse_article,
    ) -> None:
        from scrapers.epic_news import _collect_fortnite_site_articles

        mock_fetch_html.side_effect = [
            LISTING_HTML,
            ARTICLE_HTML,
        ]
        mock_parse_article.return_value = _ArticleCandidate(
            slug="extract-and-collect-sprites-on-a-new-map-in-fortnite-runners",
            title="Extract and Collect Sprites on a New Map in Fortnite: Runners",
            body=(
                "Extract. Survive. Repeat! Choose a Sprite before each match for a "
                "Sprite Power, and rescue more during a match to build your Collection."
            ),
            image_url=None,
            published_at=datetime(2026, 7, 8, 15, 0, tzinfo=timezone.utc),
            source_url="https://www.fortnite.com/news/extract-and-collect-sprites-on-a-new-map-in-fortnite-runners?lang=en-US",
        )

        candidates = _collect_fortnite_site_articles(Mock())
        self.assertEqual(len(candidates), 1)
        self.assertEqual(
            candidates[0].slug,
            "extract-and-collect-sprites-on-a-new-map-in-fortnite-runners",
        )


if __name__ == "__main__":
    unittest.main()
