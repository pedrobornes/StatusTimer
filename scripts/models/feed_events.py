"""Normalized platform feed events scraped from official sources."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from models.schemas import PatchNotePayload


class FeedSource(str, Enum):
    STEAM = "STEAM"
    REDDIT = "REDDIT"
    RIOT = "RIOT"
    EPIC = "EPIC"
    BLIZZARD = "BLIZZARD"


class FeedEventKind(str, Enum):
    NEWS = "NEWS"
    INCIDENT = "INCIDENT"


class ScrapedFeedEvent(BaseModel):
    source: FeedSource
    kind: FeedEventKind
    external_id: str = Field(min_length=1)
    game_tag: str = Field(min_length=1)
    title: str = Field(min_length=1)
    plain_text: str = Field(min_length=1)
    published_at: datetime
    source_url: str | None = None

    def to_patch_note_payload(self) -> PatchNotePayload:
        return PatchNotePayload(
            title=self.title,
            content=self.plain_text,
            gameTag=self.game_tag,
            publishedAt=self.published_at,
        )
