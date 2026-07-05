"""Orchestrates chunking, embedding, and local context indexing for RAG."""

from __future__ import annotations

import logging

from models.feed_events import ScrapedFeedEvent
from pipeline.chunking import chunk_scraped_events
from pipeline.context_store import ContextSearchResult, LocalContextStore

logger = logging.getLogger(__name__)


def ingest_events_into_context_store(
    events: list[ScrapedFeedEvent],
    store: LocalContextStore | None = None,
) -> tuple[int, LocalContextStore]:
    """Chunk scraped events and upsert them into the local context index."""
    context_store = store or LocalContextStore.from_settings()
    chunks = chunk_scraped_events(events)
    indexed_count = context_store.upsert_chunks(chunks)
    context_store.persist()

    stats = context_store.stats()
    logger.info(
        "Context store indexed %s chunks across %s games (upserted=%s)",
        stats["chunks"],
        stats["games"],
        indexed_count,
    )
    return indexed_count, context_store


def retrieve_game_context(
    game_tag: str,
    *,
    query: str | None = None,
    limit: int | None = None,
    store: LocalContextStore | None = None,
) -> list[ContextSearchResult]:
    """Fetch ranked context chunks for a game slug or tag."""
    context_store = store or LocalContextStore.from_settings()
    return context_store.search(game_tag, query=query, limit=limit)


def format_context_blocks(results: list[ContextSearchResult]) -> str:
    """Render retrieved chunks into a compact prompt-ready context block."""
    if not results:
        return ""

    blocks: list[str] = []
    for index, result in enumerate(results, start=1):
        chunk = result.chunk
        blocks.append(
            "\n".join(
                [
                    f"FACT {index} | score={result.score:.3f}",
                    chunk.display_header(),
                    chunk.text,
                ]
            )
        )

    return "\n\n".join(blocks)


def build_game_context_snapshot(
    events: list[ScrapedFeedEvent],
    *,
    store: LocalContextStore | None = None,
) -> LocalContextStore:
    """Index all provided events and return the hydrated local store."""
    _, context_store = ingest_events_into_context_store(events, store=store)
    return context_store
