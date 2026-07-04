"""Normalization helpers for raw API genre and platform tags."""

import re
import unicodedata

from models.enums import GameGenre, Platform

GENRE_KEYWORD_MAP: dict[GameGenre, tuple[str, ...]] = {
    GameGenre.SHOOTER: (
        "shooter",
        "fps",
        "tps",
        "battle royale",
        "hero shooter",
        "tactical shooter",
        "looter shooter",
    ),
    GameGenre.RPG: (
        "rpg",
        "role-playing",
        "role playing",
        "jrpg",
        "crpg",
        "action rpg",
        "soulslike",
    ),
    GameGenre.SURVIVAL: (
        "survival",
        "sandbox survival",
        "crafting",
        "open world survival",
        "extraction",
    ),
    GameGenre.ACTION: (
        "action",
        "adventure",
        "platformer",
        "hack and slash",
        "metroidvania",
        "fighting",
        "beat em up",
    ),
    GameGenre.SPORTS_RACING: (
        "sports",
        "racing",
        "sim racing",
        "football",
        "soccer",
        "basketball",
        "f1",
        "driving",
    ),
    GameGenre.STRATEGY: (
        "strategy",
        "rts",
        "4x",
        "tactical",
        "turn-based",
        "moba",
        "card battler",
    ),
}

PLATFORM_KEYWORD_MAP: dict[Platform, tuple[str, ...]] = {
    Platform.PC: ("pc", "windows", "steam", "epic", "gog", "microsoft windows"),
    Platform.PS5: ("ps5", "playstation 5", "playstation5"),
    Platform.XBOX: (
        "xbox",
        "xbox series x",
        "xbox series s",
        "xbox series",
        "xsx",
        "xss",
    ),
    Platform.SWITCH: ("switch", "nintendo switch"),
    Platform.SWITCH_2: (
        "switch 2",
        "nintendo switch 2",
        "switch2",
    ),
}

DEFAULT_GENRE = GameGenre.ACTION


def _normalize_token(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    )
    return re.sub(r"\s+", " ", ascii_value.strip().lower())


def to_slug(game_name: str) -> str:
    normalized = _normalize_token(game_name)
    slug = re.sub(r"[^a-z0-9]+", "-", normalized)
    return slug.strip("-")


def normalize_genre(raw_tags: str | list[str]) -> GameGenre:
    tokens = [raw_tags] if isinstance(raw_tags, str) else raw_tags
    normalized_tokens = [_normalize_token(token) for token in tokens if token.strip()]

    for genre, keywords in GENRE_KEYWORD_MAP.items():
        for token in normalized_tokens:
            if any(keyword in token for keyword in keywords):
                return genre

    return DEFAULT_GENRE


def normalize_platform(raw_value: str) -> Platform | None:
    token = _normalize_token(raw_value)

    for platform, keywords in PLATFORM_KEYWORD_MAP.items():
        if any(keyword in token for keyword in keywords):
            return platform

    return None
