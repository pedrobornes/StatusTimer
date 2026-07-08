"""Tests for IGDB image URL resolution."""

import unittest

from scrapers.igdb_media import (
    IGDB_GAME_FIELDS,
    parse_igdb_game_metadata,
    resolve_catalog_image_urls,
)


class IgdbMediaImageTests(unittest.TestCase):
    def test_game_fields_include_artworks_image_id(self) -> None:
        self.assertIn("artworks.image_id", IGDB_GAME_FIELDS)
        self.assertIn("cover.image_id", IGDB_GAME_FIELDS)

    def test_parse_metadata_resolves_cover_background_and_logo(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 242408,
                "name": "Counter-Strike 2",
                "slug": "counter-strike-2",
                "game_type": 0,
                "cover": {"image_id": "coaczd"},
                "artworks": [{"image_id": "ar439t"}],
            }
        )

        self.assertEqual(
            metadata.cover_url,
            "https://images.igdb.com/igdb/image/upload/t_cover_big/coaczd.jpg",
        )
        self.assertEqual(
            metadata.logo_url,
            "https://images.igdb.com/igdb/image/upload/t_cover_small/coaczd.jpg",
        )
        self.assertEqual(
            metadata.background_url,
            "https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar439t.jpg",
        )

    def test_resolve_catalog_image_urls_maps_hero_and_cover(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 1,
                "name": "Example Game",
                "game_type": 0,
                "cover": {"image_id": "co1"},
                "artworks": [{"image_id": "ar1"}],
            }
        )

        hero_url, cover_url = resolve_catalog_image_urls(metadata)

        self.assertIn("t_screenshot_huge/ar1", hero_url or "")
        self.assertIn("t_cover_big/co1", cover_url or "")

    def test_background_url_is_none_without_artworks(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 2,
                "name": "No Artwork",
                "game_type": 0,
                "cover": {"image_id": "co2"},
            }
        )

        self.assertIsNone(metadata.background_url)
        hero_url, _ = resolve_catalog_image_urls(metadata)
        self.assertIn("t_cover_small/co2", hero_url or "")

    def test_resolve_steam_app_id_from_store_url_when_category_missing(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 228349,
                "name": "Infinity Nikki",
                "slug": "infinity-nikki",
                "game_type": 0,
                "cover": {"image_id": "co1"},
                "external_games": [
                    {
                        "uid": "3164330",
                        "url": "https://store.steampowered.com/app/3164330",
                    }
                ],
            }
        )

        self.assertEqual(3164330, metadata.steam_app_id)

    def test_resolve_youtube_from_websites_extracts_channel_and_video_ids(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 228349,
                "name": "Infinity Nikki",
                "slug": "infinity-nikki",
                "game_type": 0,
                "cover": {"image_id": "co1"},
                "videos": [{"video_id": "abc123video01"}],
                "websites": [
                    {"url": "https://www.youtube.com/@InfinityNikkiEN"},
                    {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"},
                ],
            }
        )

        self.assertEqual(
            "https://www.youtube.com/@InfinityNikkiEN",
            metadata.youtube_channel_url,
        )
        self.assertEqual(
            ["abc123video01", "dQw4w9WgXcQ"],
            metadata.trailer_video_ids,
        )

    def test_resolve_external_links_from_igdb_websites(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 228349,
                "name": "Infinity Nikki",
                "slug": "infinity-nikki",
                "game_type": 0,
                "cover": {"image_id": "co1"},
                "websites": [
                    {"url": "https://infinitynikki.infoldgames.com/en/home", "category": 1},
                    {"url": "https://www.reddit.com/r/InfinityNikkiofficial", "category": 14},
                    {"url": "https://www.youtube.com/@InfinityNikkiEN", "category": 9},
                    {"url": "https://store.epicgames.com/en-US/p/infinity-nikki", "category": 16},
                ],
                "external_games": [
                    {
                        "uid": "3164330",
                        "url": "https://store.steampowered.com/app/3164330",
                    }
                ],
            }
        )

        self.assertEqual(
            "https://infinitynikki.infoldgames.com/en/home",
            metadata.external_links.get("official"),
        )
        self.assertEqual(
            "https://www.reddit.com/r/InfinityNikkiofficial/",
            metadata.external_links.get("reddit"),
        )
        self.assertIn("youtube", metadata.external_links)
        self.assertIn("epic", metadata.external_links)
        self.assertIn("steam", metadata.external_links)


if __name__ == "__main__":
    unittest.main()
