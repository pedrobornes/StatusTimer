"""Structured context chunks prepared for local RAG retrieval."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from models.feed_events import FeedEventKind, FeedSource


class ContextChunk(BaseModel):
    chunk_id: str = Field(min_length=1)
    event_id: str = Field(min_length=1)
    game_tag: str = Field(min_length=1)
    source: FeedSource
    kind: FeedEventKind
    title: str = Field(min_length=1)
    text: str = Field(min_length=1)
    published_at: datetime
    chunk_index: int = Field(ge=0)
    chunk_count: int = Field(ge=1)

    def display_header(self) -> str:
        return (
            f"[{self.source.value}/{self.kind.value}] "
            f"{self.title} ({self.published_at.isoformat()})"
        )
