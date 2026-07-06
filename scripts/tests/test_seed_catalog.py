"""Tests for catalog seed validation helpers."""

from models.catalog_schemas import GameCatalogEntryPayload
from seed_catalog import dedupe_entries, is_valid_slug, looks_like_non_game


def test_is_valid_slug_accepts_kebab_case() -> None:
    assert is_valid_slug("counter-strike-2")
    assert not is_valid_slug("Counter-Strike")
    assert not is_valid_slug("")


def test_looks_like_non_game_filters_soundtrack() -> None:
    assert looks_like_non_game("Game OST Deluxe")
    assert not looks_like_non_game("Helldivers 2")


def test_dedupe_entries_removes_duplicates_and_manual_locks() -> None:
    first = GameCatalogEntryPayload(slug="palworld", game_name="Palworld")
    duplicate = GameCatalogEntryPayload(slug="palworld", game_name="Palworld Duplicate")
    protected = GameCatalogEntryPayload(slug="valorant", game_name="Valorant")

    result = dedupe_entries([first, duplicate, protected])

    assert [entry.slug for entry in result] == ["palworld"]
