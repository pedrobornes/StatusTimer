"""File-backed local context store indexed for fast game-scoped RAG retrieval."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from config.settings import settings
from models.context_chunk import ContextChunk
from pipeline.embeddings import cosine_similarity, embed_text

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ContextSearchResult:
    chunk: ContextChunk
    score: float


class LocalContextStore:
    """Hybrid in-memory and JSON persistence for chunked harvester context."""

    def __init__(self, store_dir: Path) -> None:
        self._store_dir = store_dir
        self._chunks: dict[str, ContextChunk] = {}
        self._vectors: dict[str, dict[str, float]] = {}
        self._chunks_by_game: dict[str, list[str]] = {}
        self._store_file = store_dir / "context_index.json"
        self.load()

    @classmethod
    def from_settings(cls) -> LocalContextStore:
        return cls(Path(settings.context_store_dir))

    def load(self) -> None:
        if not self._store_file.exists():
            return

        try:
            payload = json.loads(self._store_file.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            logger.warning("Could not load context store from %s: %s", self._store_file, error)
            return

        chunks_payload = payload.get("chunks", [])
        vectors_payload = payload.get("vectors", {})
        if not isinstance(chunks_payload, list):
            return

        self._chunks.clear()
        self._vectors.clear()
        self._chunks_by_game.clear()

        for item in chunks_payload:
            chunk = ContextChunk.model_validate(item)
            vector = vectors_payload.get(chunk.chunk_id, {})
            self._register_chunk(chunk, vector if isinstance(vector, dict) else None)

    def persist(self) -> None:
        self._store_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": 1,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "chunks": [
                chunk.model_dump(mode="json")
                for chunk in sorted(
                    self._chunks.values(),
                    key=lambda item: (item.game_tag, item.published_at, item.chunk_index),
                )
            ],
            "vectors": self._vectors,
        }
        self._store_file.write_text(
            json.dumps(payload, indent=2),
            encoding="utf-8",
        )

    def upsert_chunks(self, chunks: list[ContextChunk]) -> int:
        if not chunks:
            return 0

        event_ids = {chunk.event_id for chunk in chunks}
        self._remove_events(event_ids)

        for chunk in chunks:
            vector = embed_text(f"{chunk.title} {chunk.text}")
            self._register_chunk(chunk, vector)

        self._enforce_per_game_limit()
        return len(chunks)

    def search(
        self,
        game_tag: str,
        *,
        query: str | None = None,
        limit: int | None = None,
    ) -> list[ContextSearchResult]:
        normalized_tag = game_tag.strip().lower()
        chunk_ids = self._chunks_by_game.get(normalized_tag, [])
        if not chunk_ids:
            return []

        max_results = limit or settings.context_search_limit
        candidates = [self._chunks[chunk_id] for chunk_id in chunk_ids if chunk_id in self._chunks]

        if query and query.strip():
            query_vector = embed_text(query)
            ranked = sorted(
                (
                    ContextSearchResult(
                        chunk=chunk,
                        score=cosine_similarity(query_vector, self._vectors.get(chunk.chunk_id, {})),
                    )
                    for chunk in candidates
                ),
                key=lambda result: (result.score, result.chunk.published_at),
                reverse=True,
            )
            return [result for result in ranked if result.score > 0][:max_results]

        ranked = sorted(
            candidates,
            key=lambda chunk: chunk.published_at,
            reverse=True,
        )
        return [
            ContextSearchResult(chunk=chunk, score=1.0)
            for chunk in ranked[:max_results]
        ]

    def list_game_tags(self) -> list[str]:
        return sorted(self._chunks_by_game.keys())

    def stats(self) -> dict[str, int]:
        return {
            "chunks": len(self._chunks),
            "games": len(self._chunks_by_game),
        }

    def _register_chunk(
        self,
        chunk: ContextChunk,
        vector: dict[str, float] | None,
    ) -> None:
        self._chunks[chunk.chunk_id] = chunk
        self._vectors[chunk.chunk_id] = vector or embed_text(f"{chunk.title} {chunk.text}")

        game_tag = chunk.game_tag.strip().lower()
        bucket = self._chunks_by_game.setdefault(game_tag, [])
        if chunk.chunk_id not in bucket:
            bucket.append(chunk.chunk_id)

    def _remove_events(self, event_ids: set[str]) -> None:
        if not event_ids:
            return

        removable_chunk_ids = [
            chunk_id
            for chunk_id, chunk in self._chunks.items()
            if chunk.event_id in event_ids
        ]

        for chunk_id in removable_chunk_ids:
            chunk = self._chunks.pop(chunk_id, None)
            self._vectors.pop(chunk_id, None)
            if chunk is None:
                continue

            game_tag = chunk.game_tag.strip().lower()
            bucket = self._chunks_by_game.get(game_tag, [])
            if chunk_id in bucket:
                bucket.remove(chunk_id)
            if not bucket:
                self._chunks_by_game.pop(game_tag, None)

    def _enforce_per_game_limit(self) -> None:
        max_chunks = settings.context_max_chunks_per_game
        for game_tag, chunk_ids in list(self._chunks_by_game.items()):
            if len(chunk_ids) <= max_chunks:
                continue

            ranked_ids = sorted(
                chunk_ids,
                key=lambda chunk_id: self._chunks[chunk_id].published_at,
                reverse=True,
            )
            keep_ids = set(ranked_ids[:max_chunks])
            drop_ids = [chunk_id for chunk_id in ranked_ids if chunk_id not in keep_ids]

            for chunk_id in drop_ids:
                self._chunks.pop(chunk_id, None)
                self._vectors.pop(chunk_id, None)

            self._chunks_by_game[game_tag] = [chunk_id for chunk_id in ranked_ids if chunk_id in keep_ids]
