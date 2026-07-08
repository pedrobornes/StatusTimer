"""Tests for harvester payload normalization."""

import json
import unittest
from unittest.mock import patch

from models.schemas import SyncGamesRequest
from scrapers.igdb_releases import map_igdb_metadata_to_release
from scrapers.igdb_media import IgdbGameMetadata, parse_igdb_game_metadata
from scrapers.platform_images import resolve_release_image_url
from scrapers.releases import build_release_payload, fetch_upcoming_releases


class ReleasePayloadTests(unittest.TestCase):
    def test_resolve_release_image_url_uses_igdb_direct_url(self) -> None:
        direct = "https://images.igdb.com/igdb/image/upload/t_cover_big/coabc123.jpg"
        resolved = resolve_release_image_url(direct_url=direct)
        self.assertEqual(resolved, direct)

    def test_build_release_payload_includes_image_url_alias(self) -> None:
        payload = build_release_payload(
            game_name="Example Game",
            raw_genre_tags=["action"],
            raw_platform_dates={"PC": None},
            direct_image_url="https://images.igdb.com/igdb/image/upload/t_cover_big/coabc123.jpg",
            hype_count=42,
        )

        dumped = payload.model_dump(mode="json", by_alias=True)
        self.assertIn("imageUrl", dumped)
        self.assertTrue(dumped["imageUrl"].startswith("https://images.igdb.com/"))
        self.assertEqual(dumped["hypeCount"], 42)

    def test_map_igdb_game_to_payload_maps_platforms_and_ratings(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 42,
                "name": "Grand Theft Auto VI",
                "category": 0,
                "first_release_date": 1795046400,
                "platforms": [167, 169],
                "genres": [{"name": "Adventure"}],
                "hypes": 12840,
                "rating": 92.5,
                "aggregated_rating": 95.0,
                "cover": {"image_id": "coabc123"},
                "artworks": [{"image_id": "arlogo123"}],
                "screenshots": [{"image_id": "sc1"}],
                "videos": [{"video_id": "abc123xyz"}],
            }
        )
        payload = map_igdb_metadata_to_release(metadata, {"platforms": [167, 169]})

        self.assertEqual(payload.slug, "grand-theft-auto-vi")
        self.assertEqual(payload.hype_count, 12840)
        self.assertEqual(payload.user_rating, 92)
        self.assertEqual(payload.critic_rating, 95)
        self.assertEqual(payload.trailer_video_ids, ["abc123xyz"])
        self.assertTrue(payload.image_url.startswith("https://images.igdb.com/"))
        self.assertIn("t_screenshot_huge/arlogo123", payload.logo_url or "")

    def test_release_slug_uses_igdb_slug_to_avoid_same_name_collision(self) -> None:
        """The 'Fable' reboot (igdb slug fable--1) must not collapse onto 'fable'."""
        metadata = parse_igdb_game_metadata(
            {
                "id": 92550,
                "name": "Fable",
                "slug": "fable--1",
                "category": 0,
                "first_release_date": 1803081600,
                "platforms": [6, 169],
                "cover": {"image_id": "cofable1"},
            }
        )
        payload = map_igdb_metadata_to_release(metadata, {"platforms": [6, 169]})

        self.assertEqual(payload.slug, "fable-1")
        self.assertNotEqual(payload.slug, "fable")

    def test_release_display_name_appends_year_for_disambiguated_titles(self) -> None:
        """IGDB '--N' slugs signal a name collision -> show 'Fable (2027)'."""
        metadata = parse_igdb_game_metadata(
            {
                "id": 92550,
                "name": "Fable",
                "slug": "fable--1",
                "category": 0,
                "first_release_date": 1803081600,
                "platforms": [6, 169],
                "cover": {"image_id": "cofable1"},
            }
        )
        payload = map_igdb_metadata_to_release(metadata, {"platforms": [6, 169]})

        self.assertEqual(payload.game_name, "Fable (2027)")

    def test_release_display_name_unchanged_for_unique_titles(self) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "id": 521,
                "name": "Fable",
                "slug": "fable",
                "category": 0,
                "first_release_date": 1095120000,
                "platforms": [6],
                "cover": {"image_id": "cofable"},
            }
        )
        payload = map_igdb_metadata_to_release(metadata, {"platforms": [6]})

        self.assertEqual(payload.game_name, "Fable")

    @patch("scrapers.releases.fetch_igdb_upcoming_releases")
    def test_fetch_upcoming_releases_serializes_image_url_for_sync(self, mock_fetch) -> None:
        metadata = parse_igdb_game_metadata(
            {
                "name": "Grand Theft Auto VI",
                "category": 0,
                "first_release_date": 1795046400,
                "platforms": [167, 169],
                "genres": [{"name": "Adventure"}],
                "hypes": 100,
                "cover": {"image_id": "coabc123"},
            }
        )
        mock_fetch.return_value = [
            map_igdb_metadata_to_release(metadata, {"platforms": [167, 169]})
        ]

        request = SyncGamesRequest(releases=fetch_upcoming_releases())
        serialized = json.loads(request.model_dump_json(by_alias=True))

        self.assertEqual(len(serialized["releases"]), 1)
        release = serialized["releases"][0]
        self.assertIn("imageUrl", release)
        self.assertTrue(release["imageUrl"].startswith("https://images.igdb.com/"))
        self.assertEqual(release["slug"], "grand-theft-auto-vi")
        self.assertLessEqual(len(release["imageUrl"]), 2048)

    @patch("scrapers.releases.fetch_igdb_upcoming_releases")
    def test_fetch_upcoming_releases_returns_empty_without_igdb_rows(self, mock_fetch) -> None:
        mock_fetch.return_value = []
        self.assertEqual(fetch_upcoming_releases(), [])


if __name__ == "__main__":
    unittest.main()
