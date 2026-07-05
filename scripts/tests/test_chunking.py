"""Tests for sentence-aware chunking."""

import unittest
from datetime import datetime, timezone

from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.chunking import chunk_scraped_event, pack_sentences, split_sentences


class ChunkingTests(unittest.TestCase):
    def test_split_sentences_breaks_on_punctuation(self) -> None:
        sentences = split_sentences("Alpha update. Beta patch! Gamma hotfix?")
        self.assertEqual(len(sentences), 3)

    def test_pack_sentences_respects_max_chars(self) -> None:
        sentences = [
            "A" * 120,
            "B" * 120,
            "C" * 120,
            "D" * 120,
        ]
        chunks = pack_sentences(sentences, max_chars=260, overlap_chars=40)
        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(all(len(chunk) <= 260 for chunk in chunks))

    def test_chunk_scraped_event_assigns_chunk_metadata(self) -> None:
        event = ScrapedFeedEvent(
            source=FeedSource.STEAM,
            kind=FeedEventKind.NEWS,
            external_id="steam-1",
            game_tag="counter-strike-2",
            title="[STEAM NEWS] Counter-Strike 2: Patch",
            plain_text="First change. Second change. Third change.",
            published_at=datetime(2026, 7, 1, tzinfo=timezone.utc),
        )

        chunks = chunk_scraped_event(event)
        self.assertGreaterEqual(len(chunks), 1)
        self.assertEqual(chunks[0].chunk_count, len(chunks))
        self.assertEqual(chunks[0].game_tag, "counter-strike-2")


if __name__ == "__main__":
    unittest.main()
