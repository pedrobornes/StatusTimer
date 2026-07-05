"""Tests for context pipeline orchestration."""

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.context_pipeline import (
    format_context_blocks,
    ingest_events_into_context_store,
    retrieve_game_context,
)
from pipeline.context_store import LocalContextStore


class ContextPipelineTests(unittest.TestCase):
    def test_ingest_and_retrieve_game_context(self) -> None:
        event = ScrapedFeedEvent(
            source=FeedSource.RIOT,
            kind=FeedEventKind.INCIDENT,
            external_id="riot-42",
            game_tag="valorant",
            title="[RIOT INCIDENT] Login issues",
            plain_text="Players cannot authenticate in North America. Engineers are investigating.",
            published_at=datetime(2026, 7, 5, tzinfo=timezone.utc),
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            store = LocalContextStore(Path(temp_dir))
            indexed, hydrated_store = ingest_events_into_context_store([event], store=store)
            self.assertGreaterEqual(indexed, 1)

            hits = retrieve_game_context(
                "valorant",
                query="authenticate",
                store=hydrated_store,
            )
            self.assertGreaterEqual(len(hits), 1)

            prompt_block = format_context_blocks(hits)
            self.assertIn("FACT 1", prompt_block)
            self.assertIn("authenticate", prompt_block.lower())


if __name__ == "__main__":
    unittest.main()
