"""Tests for daily incremental release harvest scheduling."""

import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

from datetime import date

from models.enums import Platform
from models.schemas import GameReleasePayload, PlatformRelease
from pipeline import release_harvest


class ReleaseHarvestScheduleTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmpdir = tempfile.TemporaryDirectory()
        self.state_path = Path(self._tmpdir.name) / "release_harvest_state.json"
        self.settings_patch = patch.object(
            release_harvest.settings,
            "release_harvest_state_file",
            str(self.state_path),
        )
        self.settings_patch.start()
        self.addCleanup(self.settings_patch.stop)
        self.addCleanup(self._tmpdir.cleanup)

    @patch("pipeline.release_harvest.fetch_igdb_upcoming_releases_batch")
    def test_skips_harvest_when_interval_not_elapsed(self, batch_mock: MagicMock) -> None:
        recent = datetime.now(timezone.utc) - timedelta(hours=2)
        self.state_path.write_text(
            json.dumps({"last_harvest_at": recent.isoformat(), "query_offset": 30}),
            encoding="utf-8",
        )

        with patch.object(release_harvest.settings, "release_harvest_interval_hours", 24):
            releases = release_harvest.fetch_scheduled_upcoming_releases()

        self.assertEqual(releases, [])
        batch_mock.assert_not_called()

    @patch("pipeline.release_harvest.fetch_igdb_upcoming_releases_batch")
    def test_harvests_batch_and_advances_offset(self, batch_mock: MagicMock) -> None:
        payload = GameReleasePayload(
            gameName="Example",
            slug="example",
            genreNames=["Action"],
            platforms=[PlatformRelease(platform=Platform.PC, release_date=date(2027, 1, 1))],
            hypeCount=10,
            imageUrl=None,
            logoUrl=None,
        )
        batch_mock.return_value = ([payload], 30, False)

        with patch.object(release_harvest.settings, "release_harvest_interval_hours", 24):
            releases = release_harvest.fetch_scheduled_upcoming_releases()

        self.assertEqual(releases, [payload])
        saved = json.loads(self.state_path.read_text(encoding="utf-8"))
        self.assertEqual(saved["query_offset"], 30)
        self.assertEqual(saved["last_batch_raw_count"], 30)
        self.assertFalse(saved["catalog_exhausted"])

    @patch("pipeline.release_harvest.fetch_igdb_upcoming_releases_batch")
    def test_resets_offset_when_catalog_exhausted(self, batch_mock: MagicMock) -> None:
        self.state_path.write_text(
            json.dumps({"last_harvest_at": "2020-01-01T00:00:00+00:00", "query_offset": 120}),
            encoding="utf-8",
        )
        batch_mock.return_value = ([], 10, True)

        with patch.object(release_harvest.settings, "release_harvest_interval_hours", 24):
            release_harvest.fetch_scheduled_upcoming_releases()

        saved = json.loads(self.state_path.read_text(encoding="utf-8"))
        self.assertEqual(saved["query_offset"], 0)
        self.assertTrue(saved["catalog_exhausted"])


if __name__ == "__main__":
    unittest.main()
