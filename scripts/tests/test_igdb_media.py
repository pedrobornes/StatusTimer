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
        self.assertIn("artworks.width", IGDB_GAME_FIELDS)
        self.assertIn("artworks.height", IGDB_GAME_FIELDS)
        self.assertIn("screenshots.width", IGDB_GAME_FIELDS)
        self.assertIn("screenshots.height", IGDB_GAME_FIELDS)
        self.assertIn("cover.image_id", IGDB_GAME_FIELDS)

    def test_parse_metadata_resolves_cover_background_and_logo(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 242408,
                "name": "Counter-Strike 2",
                "slug": "counter-strike-2",
                "game_type": 0,
                "cover": {"image_id": "coaczd"},
                "artworks": [{"image_id": "ar439t", "width": 3840, "height": 2160}],
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
                "artworks": [{"image_id": "ar1", "width": 1920, "height": 1080}],
            }
        )

        hero_url, cover_url = resolve_catalog_image_urls(metadata)

        self.assertIn("t_screenshot_huge/ar1", hero_url or "")
        self.assertIn("t_cover_big/co1", cover_url or "")

    def test_background_prefers_largest_landscape_artwork(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 242408,
                "name": "Counter-Strike 2",
                "slug": "counter-strike-2",
                "game_type": 0,
                "cover": {"image_id": "coaczd"},
                "artworks": [
                    {"image_id": "ar4kon", "width": 1279, "height": 720},
                    {"image_id": "ar439t", "width": 3840, "height": 1240},
                ],
            }
        )

        self.assertIn("t_screenshot_huge/ar439t", metadata.background_url or "")

    def test_background_prefers_landscape_artwork_closest_to_16_by_9(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 52189,
                "name": "Grand Theft Auto VI",
                "slug": "grand-theft-auto-vi",
                "game_type": 0,
                "cover": {"image_id": "cocaa5"},
                "artworks": [
                    {"image_id": "ar6451", "width": 2160, "height": 2160},
                    {"image_id": "ar6457", "width": 3840, "height": 2160},
                    {"image_id": "ar64ej", "width": 3404, "height": 2303},
                ],
            }
        )

        self.assertIn("t_screenshot_huge/ar6457", metadata.background_url or "")

    def test_background_prefers_artwork_over_screenshot_when_both_are_valid(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 242408,
                "name": "Counter-Strike 2",
                "slug": "counter-strike-2",
                "game_type": 0,
                "cover": {"image_id": "coaczd"},
                "artworks": [{"image_id": "ar4kon", "width": 3840, "height": 2160}],
                "screenshots": [{"image_id": "scoqi1", "width": 1920, "height": 1080}],
            }
        )

        self.assertIn("t_screenshot_huge/ar4kon", metadata.background_url or "")

    def test_hero_ignores_screenshots_without_landscape_art(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 3,
                "name": "Screenshot Only",
                "game_type": 0,
                "cover": {"image_id": "co3"},
                "screenshots": [{"image_id": "sc3a"}, {"image_id": "sc3b"}],
            }
        )

        self.assertIsNone(metadata.background_url)
        hero_url, _ = resolve_catalog_image_urls(metadata)
        self.assertIsNone(hero_url)

    def test_background_ignores_screenshots_without_artworks(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 3,
                "name": "Screenshot Only",
                "game_type": 0,
                "cover": {"image_id": "co3"},
                "screenshots": [{"image_id": "sc3a", "width": 1920, "height": 1080}],
            }
        )

        self.assertIsNone(metadata.background_url)
        hero_url, _ = resolve_catalog_image_urls(metadata)
        self.assertIsNone(hero_url)

    def test_background_falls_back_to_landscape_screenshot_with_dimensions(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 3,
                "name": "Screenshot Only",
                "game_type": 0,
                "cover": {"image_id": "co3"},
                "screenshots": [{"image_id": "sc3a", "width": 1920, "height": 1080}],
            }
        )

        self.assertIsNone(metadata.background_url)
        hero_url, _ = resolve_catalog_image_urls(metadata)
        self.assertIsNone(hero_url)

    def test_background_falls_back_to_screenshot_when_artwork_is_too_small(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 1020,
                "name": "Grand Theft Auto V",
                "slug": "grand-theft-auto-v",
                "game_type": 0,
                "cover": {"image_id": "co2lbd"},
                "artworks": [{"image_id": "ar667x", "width": 256, "height": 256}],
                "screenshots": [{"image_id": "sc10f95", "width": 1920, "height": 1080}],
            }
        )

        self.assertIsNone(metadata.background_url)

    def test_hero_returns_none_without_landscape_art(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 2,
                "name": "No Artwork",
                "game_type": 0,
                "cover": {"image_id": "co2"},
            }
        )

        self.assertIsNone(metadata.background_url)
        self.assertEqual([], metadata.screenshot_urls)
        hero_url, _ = resolve_catalog_image_urls(metadata)
        self.assertIsNone(hero_url)

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
