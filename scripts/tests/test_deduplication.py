"""Tests for MD5 deduplication pipeline."""

import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path

from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.deduplication import DedupStore, filter_new_events, within_lookback_window


class DeduplicationTests(unittest.TestCase):
    def test_filter_new_events_skips_seen_fingerprints(self) -> None:
        event = ScrapedFeedEvent(
            source=FeedSource.STEAM,
            kind=FeedEventKind.NEWS,
            external_id="abc-123",
            game_tag="counter-strike-2",
            title="[STEAM NEWS] Test",
            plain_text="Plain update text",
            published_at=datetime(2026, 7, 1, tzinfo=timezone.utc),
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            store = DedupStore(Path(temp_dir) / "state.json")
            first_pass = filter_new_events([event], store)
            second_pass = filter_new_events([event], store)
            store.persist()

            self.assertEqual(len(first_pass), 1)
            self.assertEqual(len(second_pass), 0)

    def test_within_lookback_window_uses_reference_time(self) -> None:
        published_at = datetime(2026, 7, 1, tzinfo=timezone.utc)
        reference = datetime(2026, 7, 5, tzinfo=timezone.utc)

        self.assertTrue(
            within_lookback_window(
                published_at,
                lookback_days=7,
                reference_time=reference,
            )
        )
        self.assertFalse(
            within_lookback_window(
                datetime(2026, 6, 20, tzinfo=timezone.utc),
                lookback_days=7,
                reference_time=reference,
            )
        )


if __name__ == "__main__":
    unittest.main()
