"""Sentence-aware chunking for harvested platform feed events."""

from __future__ import annotations

import hashlib
import re

from config.settings import settings
from models.context_chunk import ContextChunk
from models.feed_events import ScrapedFeedEvent

_SENTENCE_SPLIT_PATTERN = re.compile(r"(?<=[.!?])\s+")


def chunk_scraped_event(event: ScrapedFeedEvent) -> list[ContextChunk]:
    """Split a scraped event into digestible plain-text context chunks."""
    sentences = split_sentences(event.plain_text)
    if not sentences:
        sentences = [event.plain_text.strip()]

    packed_chunks = pack_sentences(
        sentences,
        max_chars=settings.context_chunk_max_chars,
        overlap_chars=settings.context_chunk_overlap_chars,
    )
    event_id = _build_event_id(event)
    chunk_count = len(packed_chunks)

    return [
        ContextChunk(
            chunk_id=_build_chunk_id(event_id, index),
            event_id=event_id,
            game_tag=event.game_tag,
            source=event.source,
            kind=event.kind,
            title=event.title,
            text=chunk_text,
            published_at=event.published_at,
            chunk_index=index,
            chunk_count=chunk_count,
        )
        for index, chunk_text in enumerate(packed_chunks)
    ]


def chunk_scraped_events(events: list[ScrapedFeedEvent]) -> list[ContextChunk]:
    chunks: list[ContextChunk] = []
    for event in events:
        chunks.extend(chunk_scraped_event(event))
    return chunks


def split_sentences(text: str) -> list[str]:
    normalized = " ".join(text.split())
    if not normalized:
        return []

    parts = _SENTENCE_SPLIT_PATTERN.split(normalized)
    return [part.strip() for part in parts if part.strip()]


def pack_sentences(
    sentences: list[str],
    *,
    max_chars: int,
    overlap_chars: int,
) -> list[str]:
    if not sentences:
        return []

    chunks: list[str] = []
    current_sentences: list[str] = []
    current_length = 0

    for sentence in sentences:
        sentence_length = len(sentence)
        projected_length = current_length + sentence_length + (1 if current_sentences else 0)

        if current_sentences and projected_length > max_chars:
            chunks.append(" ".join(current_sentences))
            current_sentences = _overlap_tail(current_sentences, overlap_chars)
            current_length = sum(len(item) for item in current_sentences) + max(
                0,
                len(current_sentences) - 1,
            )

        current_sentences.append(sentence)
        current_length += sentence_length + (1 if len(current_sentences) > 1 else 0)

    if current_sentences:
        chunks.append(" ".join(current_sentences))

    return chunks


def _overlap_tail(sentences: list[str], overlap_chars: int) -> list[str]:
    if overlap_chars <= 0 or not sentences:
        return []

    selected: list[str] = []
    running_length = 0

    for sentence in reversed(sentences):
        selected.insert(0, sentence)
        running_length += len(sentence)
        if running_length >= overlap_chars:
            break

    return selected


def _build_event_id(event: ScrapedFeedEvent) -> str:
    canonical = "|".join(
        [
            event.source.value,
            event.kind.value,
            event.external_id,
            event.game_tag,
            event.published_at.isoformat(),
        ]
    )
    return hashlib.md5(canonical.encode("utf-8")).hexdigest()


def _build_chunk_id(event_id: str, chunk_index: int) -> str:
    return hashlib.md5(f"{event_id}:{chunk_index}".encode("utf-8")).hexdigest()
