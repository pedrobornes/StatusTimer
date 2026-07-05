"""External cover art URL helpers sourced from platform CDNs and status pages."""

from __future__ import annotations

STEAM_HEADER_CDN_TEMPLATE = (
    "https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/header.jpg"
)
STEAM_LOGO_CDN_TEMPLATE = (
    "https://cdn.cloudflare.steamstatic.com/steam/apps/{app_id}/logo.png"
)
EPIC_FORTNITE_KEY_ART = (
    "https://cdn2.unrealengine.com/14fortnite-1920x1080-fortnite-key-art-1920x1080-432356386.jpg"
)
RIOT_VALORANT_LOGO = (
    "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/"
    "7b76209193f1bfe190d3ae6ef8728328870be9c3-736x138.png?accountingTag=VAL"
)
RIOT_VALORANT_KEY_ART = "/images/games/valorant-cover.jpg"
ROCKSTAR_GTA_VI_LOGO = "/images/games/gta-vi-logo.png"
ROCKSTAR_GTA_VI_KEY_ART = "/images/games/gta-vi-cover.jpg"


def steam_header_url(app_id: int) -> str:
    """Build a Steam Store header image URL from a public app ID."""
    return STEAM_HEADER_CDN_TEMPLATE.format(app_id=app_id)


def steam_logo_url(app_id: int) -> str:
    """Build a Steam Store logo/icon URL from a public app ID."""
    return STEAM_LOGO_CDN_TEMPLATE.format(app_id=app_id)


def resolve_release_image_url(
    *,
    steam_app_id: int | None = None,
    direct_url: str | None = None,
) -> str | None:
    """
    Resolve a direct external image URL from platform metadata.

    Prefer an explicit CDN URL from the upstream API. Fall back to known
    Steam header URL patterns when only an app ID is available.
    """
    if direct_url is not None:
        trimmed = direct_url.strip()
        return trimmed or None

    if steam_app_id is not None:
        return steam_header_url(steam_app_id)

    return None


def resolve_release_logo_url(
    *,
    steam_app_id: int | None = None,
    direct_url: str | None = None,
) -> str | None:
    """Resolve a card-sized logo URL from platform metadata."""
    if direct_url is not None:
        trimmed = direct_url.strip()
        return trimmed or None

    if steam_app_id is not None:
        return steam_logo_url(steam_app_id)

    return None
