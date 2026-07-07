"""Tests for Steam Store catalog enrichment."""

from scrapers.steam_store import _parse_price_cents, enrich_catalog_entries_with_steam_store
from models.catalog_schemas import GameCatalogEntryPayload


def test_parse_price_cents_accepts_valid_values() -> None:
    assert _parse_price_cents(1999) == 1999
    assert _parse_price_cents(0) == 0
    assert _parse_price_cents(-1) is None
    assert _parse_price_cents(None) is None


def test_enrich_skips_entries_without_steam_app_id() -> None:
    entry = GameCatalogEntryPayload(slug="valorant", game_name="Valorant")
    result = enrich_catalog_entries_with_steam_store([entry])
    assert result == [entry]
