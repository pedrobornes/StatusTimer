"""Pydantic schemas for harvested release and patch-note payloads."""

from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from models.enums import GameGenre, Platform


class PlatformRelease(BaseModel):
    """Per-platform launch window. Use release_date=None when the source reports TBA."""

    platform: Platform
    release_date: date | None = Field(
        default=None,
        alias="releaseDate",
        description="ISO calendar date for the platform launch, or None if TBA.",
    )

    model_config = {"populate_by_name": True}


class GameReleasePayload(BaseModel):
    game_name: str = Field(alias="gameName", min_length=1)
    slug: str = Field(min_length=1)
    genre: GameGenre
    platforms: list[PlatformRelease] = Field(min_length=1)
    hype_count: int = Field(default=0, alias="hypeCount", ge=0)
    image_url: str | None = Field(
        default=None,
        alias="imageUrl",
        max_length=2048,
        description="IGDB cover art URL in high quality.",
    )
    logo_url: str | None = Field(
        default=None,
        alias="logoUrl",
        max_length=2048,
        description="IGDB artwork/logo URL for cards.",
    )
    igdb_game_id: int | None = Field(default=None, alias="igdbGameId", ge=1)
    user_rating: int | None = Field(default=None, alias="userRating", ge=0, le=100)
    critic_rating: int | None = Field(default=None, alias="criticRating", ge=0, le=100)
    screenshot_urls: list[str] = Field(default_factory=list, alias="screenshotUrls")
    trailer_video_ids: list[str] = Field(default_factory=list, alias="trailerVideoIds")
    steam_app_id: int | None = Field(default=None, alias="steamAppId", ge=1)

    model_config = {"populate_by_name": True}

    @field_validator("image_url", "logo_url")
    @classmethod
    def normalize_optional_url(cls, value: str | None) -> str | None:
        if value is None:
            return None

        trimmed = value.strip()
        return trimmed or None

    @field_validator("platforms")
    @classmethod
    def ensure_unique_platforms(
        cls,
        platforms: list[PlatformRelease],
    ) -> list[PlatformRelease]:
        seen: set[Platform] = set()
        for entry in platforms:
            if entry.platform in seen:
                raise ValueError(
                    f"Duplicate platform entry detected: {entry.platform.value}",
                )
            seen.add(entry.platform)
        return platforms


class SyncGamesRequest(BaseModel):
    """Batch payload for the future Spring Boot games sync endpoint."""

    releases: list[GameReleasePayload] = Field(min_length=1)

    model_config = {"populate_by_name": True}


class PatchNotePayload(BaseModel):
    """Structured intel packet ready for POST /api/v1/internal/news."""

    title: str = Field(min_length=1)
    content: str = Field(min_length=1)
    game_tag: str = Field(alias="gameTag", min_length=1)
    published_at: datetime = Field(alias="publishedAt")

    model_config = {"populate_by_name": True}
