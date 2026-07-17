"""Tests for pinned-game IGDB catalog enrichment."""

import unittest
from unittest.mock import MagicMock, patch

from models.catalog_schemas import GameCatalogEntryPayload
from scrapers.igdb_catalog_enrichment import enrich_catalog_entries_with_igdb
from scrapers.igdb_media import IgdbGameMetadata


class IgdbCatalogEnrichmentPinnedGameTests(unittest.TestCase):
    @patch("scrapers.igdb_catalog_enrichment.is_igdb_configured", return_value=True)
    @patch("scrapers.igdb_catalog_enrichment.IgdbClient")
    def test_counter_strike_twitch_slug_maps_to_cs2_assets(
        self,
        mock_client_cls,
        _mock_configured,
    ) -> None:
        client = MagicMock()
        mock_client_cls.return_value = client
        client.lookup_game_metadata_by_slug.return_value = IgdbGameMetadata(
            igdb_game_id=242408,
            name="Counter-Strike 2",
            slug="counter-strike-2",
            logo_url="https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar439t.jpg",
            cover_url="https://images.igdb.com/igdb/image/upload/t_cover_big/coaczd.jpg",
            background_url="https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar439t.jpg",
            user_rating=90,
            critic_rating=88,
            steam_app_id=730,
        )

        entries = enrich_catalog_entries_with_igdb(
            [
                GameCatalogEntryPayload(
                    slug="counter-strike",
                    game_name="Counter-Strike",
                    twitch_game_id="32399",
                    twitch_rank=1,
                )
            ]
        )

        self.assertEqual(entries[0].slug, "counter-strike-2")
        self.assertEqual(entries[0].steam_app_id, 730)
        self.assertEqual(entries[0].igdb_game_id, 242408)
        self.assertIn("coaczd", entries[0].cover_url or "")
        client.lookup_game_metadata.assert_not_called()
        client.lookup_game_metadata_by_slug.assert_called_once_with("counter-strike-2")

    @patch("scrapers.igdb_catalog_enrichment.is_igdb_configured", return_value=True)
    @patch("scrapers.igdb_catalog_enrichment.IgdbClient")
    def test_path_of_exile_rejects_poe2_name_search_hit(
        self,
        mock_client_cls,
        _mock_configured,
    ) -> None:
        client = MagicMock()
        mock_client_cls.return_value = client
        client.lookup_game_metadata_by_slug.side_effect = [
            # First call is pinned lookup for path-of-exile
            IgdbGameMetadata(
                igdb_game_id=19164,
                name="Path of Exile",
                slug="path-of-exile",
                logo_url="https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar12fj.jpg",
                cover_url="https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7h.jpg",
                background_url="https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar12fj.jpg",
                user_rating=82,
                critic_rating=78,
                steam_app_id=238960,
            )
        ]

        entries = enrich_catalog_entries_with_igdb(
            [
                GameCatalogEntryPayload(
                    slug="path-of-exile",
                    game_name="Path of Exile",
                    twitch_game_id="29307",
                    twitch_rank=1,
                )
            ]
        )

        self.assertEqual(entries[0].steam_app_id, 238960)
        self.assertEqual(entries[0].igdb_game_id, 19164)
        self.assertNotEqual(entries[0].steam_app_id, 2694490)

    @patch("scrapers.igdb_catalog_enrichment.is_igdb_configured", return_value=True)
    @patch("scrapers.igdb_catalog_enrichment.IgdbClient")
    def test_unpinned_slug_lookup_rejects_sequel_name_hit(
        self,
        mock_client_cls,
        _mock_configured,
    ) -> None:
        client = MagicMock()
        mock_client_cls.return_value = client
        client.lookup_game_metadata_by_slug.return_value = None
        client.lookup_game_metadata.return_value = IgdbGameMetadata(
            igdb_game_id=125642,
            name="Path of Exile 2",
            slug="path-of-exile-2",
            logo_url="https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar37ie.jpg",
            cover_url="https://images.igdb.com/igdb/image/upload/t_cover_big/co8ae0.jpg",
            background_url="https://images.igdb.com/igdb/image/upload/t_screenshot_huge/ar37ie.jpg",
            user_rating=88,
            critic_rating=78,
            steam_app_id=2694490,
        )

        # Use a non-pinned slug path by temporarily relying on name search rejection.
        # "example-arpg" is not pinned; simulate PoE collision pattern via metadata slug check
        # through a custom slug that isn't pinned - use path-of-exile without pin by mocking get_pinned.
        with patch("scrapers.igdb_catalog_enrichment.get_pinned_game", return_value=None):
            entries = enrich_catalog_entries_with_igdb(
                [
                    GameCatalogEntryPayload(
                        slug="path-of-exile",
                        game_name="Path of Exile",
                    )
                ]
            )

        self.assertIsNone(entries[0].steam_app_id)
        self.assertIsNone(entries[0].igdb_game_id)


if __name__ == "__main__":
    unittest.main()
