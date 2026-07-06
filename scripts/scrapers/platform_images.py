"""Image URL helpers for catalog and release payloads (IGDB-sourced)."""

from __future__ import annotations

IGDB_IMAGE_HOST = "images.igdb.com"


def is_igdb_image_url(url: str | None) -> bool:
    if url is None:
        return False

    trimmed = url.strip()
    return bool(trimmed) and IGDB_IMAGE_HOST in trimmed.casefold()


def sanitize_igdb_image_url(url: str | None) -> str | None:
    if not is_igdb_image_url(url):
        return None

    return url.strip()  # type: ignore[union-attr]


def resolve_release_image_url(
    *,
    direct_url: str | None = None,
) -> str | None:
    """Resolve a release cover URL from IGDB artwork."""
    return sanitize_igdb_image_url(direct_url)


def resolve_release_logo_url(
    *,
    direct_url: str | None = None,
) -> str | None:
    """Resolve a card-sized logo URL from IGDB artwork."""
    return sanitize_igdb_image_url(direct_url)
