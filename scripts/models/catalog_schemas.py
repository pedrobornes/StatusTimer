"""Pydantic schemas for tracked game catalog ingestion."""

from pydantic import BaseModel, ConfigDict, Field


class GameCatalogEntryPayload(BaseModel):
    slug: str = Field(min_length=1)
    game_name: str = Field(alias="gameName", min_length=1)
    steam_app_id: int | None = Field(default=None, alias="steamAppId")
    logo_url: str | None = Field(default=None, alias="logoUrl", max_length=2048)
    cover_url: str | None = Field(default=None, alias="coverUrl", max_length=2048)
    twitch_game_id: str | None = Field(default=None, alias="twitchGameId", max_length=64)
    twitch_rank: int | None = Field(default=None, alias="twitchRank", ge=1)
    live_players: int | None = Field(default=None, alias="livePlayers", ge=0)
    twitch_viewers: int | None = Field(default=None, alias="twitchViewers", ge=0)
    featured: bool = False
    igdb_game_id: int | None = Field(default=None, alias="igdbGameId", ge=1)
    genre_name: str | None = Field(default=None, alias="genreName", max_length=64)
    user_rating: int | None = Field(default=None, alias="userRating", ge=0, le=100)
    critic_rating: int | None = Field(default=None, alias="criticRating", ge=0, le=100)
    themes: list[str] = Field(default_factory=list)
    screenshot_urls: list[str] = Field(default_factory=list, alias="screenshotUrls")
    trailer_video_ids: list[str] = Field(default_factory=list, alias="trailerVideoIds")

    model_config = ConfigDict(populate_by_name=True)


class SyncGameCatalogRequest(BaseModel):
    entries: list[GameCatalogEntryPayload] = Field(min_length=1)

    model_config = ConfigDict(populate_by_name=True)


class SyncGameCatalogResponse(BaseModel):
    created: int
    updated: int
    skipped: int
    total: int

    model_config = ConfigDict(populate_by_name=True)
