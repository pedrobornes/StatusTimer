"""Tests for local context store indexing and retrieval."""

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from models.context_chunk import ContextChunk
from models.feed_events import FeedEventKind, FeedSource
from pipeline.context_store import LocalContextStore


class LocalContextStoreTests(unittest.TestCase):
    def test_search_by_game_tag_returns_ranked_results(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            store = LocalContextStore(Path(temp_dir))
            store.upsert_chunks(
                [
                    self._chunk(
                        chunk_id="a",
                        game_tag="valorant",
                        text="Valorant login outage in North America.",
                    ),
                    self._chunk(
                        chunk_id="b",
                        game_tag="valorant",
                        text="Patch notes include weapon balance updates.",
                    ),
                    self._chunk(
                        chunk_id="c",
                        game_tag="fortnite",
                        text="Fortnite matchmaking degraded in EU.",
                    ),
                ]
            )

            outage_hits = store.search("valorant", query="login outage")
            self.assertEqual(len(outage_hits), 1)
            self.assertEqual(outage_hits[0].chunk.chunk_id, "a")

            all_valorant = store.search("valorant")
            self.assertEqual(len(all_valorant), 2)

    def test_persist_and_reload_store(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir)
            first_store = LocalContextStore(path)
            first_store.upsert_chunks(
                [
                    self._chunk(
                        chunk_id="persist-1",
                        game_tag="dota-2",
                        text="Dota 2 server maintenance completed.",
                    )
                ]
            )
            first_store.persist()

            second_store = LocalContextStore(path)
            self.assertEqual(second_store.stats()["chunks"], 1)
            hits = second_store.search("dota-2", query="maintenance")
            self.assertEqual(len(hits), 1)

    def _chunk(self, *, chunk_id: str, game_tag: str, text: str) -> ContextChunk:
        return ContextChunk(
            chunk_id=chunk_id,
            event_id=f"event-{chunk_id}",
            game_tag=game_tag,
            source=FeedSource.STEAM,
            kind=FeedEventKind.NEWS,
            title="Test title",
            text=text,
            published_at=datetime(2026, 7, 1, tzinfo=timezone.utc),
            chunk_index=0,
            chunk_count=1,
        )


if __name__ == "__main__":
    unittest.main()
