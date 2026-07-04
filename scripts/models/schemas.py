"""Pydantic schemas for harvested release and patch-note payloads."""

from datetime import date

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

    model_config = {"populate_by_name": True}

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

    model_config = {"populate_by_name": True}
