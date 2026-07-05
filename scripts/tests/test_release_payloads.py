"""Tests for harvester payload normalization."""

import json
import unittest

from models.schemas import SyncGamesRequest
from scrapers.platform_images import resolve_release_image_url, steam_header_url
from scrapers.releases import build_release_payload, fetch_upcoming_releases


class ReleasePayloadTests(unittest.TestCase):
    def test_steam_header_url_uses_cdn_template(self) -> None:
        url = steam_header_url(1030300)
        self.assertEqual(
            url,
            "https://cdn.cloudflare.steamstatic.com/steam/apps/1030300/header.jpg",
        )

    def test_resolve_release_image_url_prefers_direct_cdn_url(self) -> None:
        direct = "https://example.cdn/game-cover.jpg"
        resolved = resolve_release_image_url(
            steam_app_id=730,
            direct_url=direct,
        )
        self.assertEqual(resolved, direct)

    def test_build_release_payload_includes_image_url_alias(self) -> None:
        payload = build_release_payload(
            game_name="Hollow Knight: Silksong",
            raw_genre_tags=["action"],
            raw_platform_dates={"PC": None},
            steam_app_id=1030300,
        )

        dumped = payload.model_dump(mode="json", by_alias=True)
        self.assertIn("imageUrl", dumped)
        self.assertTrue(dumped["imageUrl"].startswith("https://"))

    def test_fetch_upcoming_releases_serializes_image_url_for_sync(self) -> None:
        request = SyncGamesRequest(releases=fetch_upcoming_releases())
        serialized = json.loads(request.model_dump_json(by_alias=True))

        for release in serialized["releases"]:
            self.assertIn("imageUrl", release)
            self.assertIn("logoUrl", release)
            self.assertIsNotNone(release["imageUrl"])
            if release["slug"] == "hollow-knight-silksong":
                self.assertIsNotNone(release["logoUrl"])
            self.assertLessEqual(len(release["imageUrl"]), 2048)


if __name__ == "__main__":
    unittest.main()
