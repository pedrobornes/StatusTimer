"""Tests for Riot platform telemetry status parsing."""

import unittest

from scrapers.riot_telemetry import _is_active_riot_status_record, _resolve_platform_status


class RiotTelemetryTests(unittest.TestCase):
    def test_completed_maintenance_is_not_active(self) -> None:
        record = {
            "id": 42,
            "maintenance_status": "complete",
            "updates": [{"content": "<p>Patch deployed.</p>"}],
        }

        self.assertFalse(_is_active_riot_status_record(record))

    def test_in_progress_maintenance_is_active(self) -> None:
        record = {
            "id": 43,
            "maintenance_status": "in_progress",
            "updates": [{"content": "<p>Servers updating.</p>"}],
        }

        self.assertTrue(_is_active_riot_status_record(record))

    def test_scheduled_maintenance_is_not_active(self) -> None:
        record = {
            "id": 44,
            "maintenance_status": "scheduled",
            "updates": [{"content": "<p>Patch maintenance planned.</p>"}],
        }

        self.assertFalse(_is_active_riot_status_record(record))

    def test_resolve_platform_status_returns_online_when_only_scheduled_maintenance(self) -> None:
        payload = {
            "incidents": [],
            "maintenances": [
                {
                    "id": 100,
                    "maintenance_status": "scheduled",
                    "updates": [{"content": "<p>Patch 26.14 maintenance scheduled.</p>"}],
                }
            ],
        }

        status, context, ambiguous = _resolve_platform_status(payload)

        self.assertEqual(status.value, "ONLINE")
        self.assertIsNone(context)
        self.assertFalse(ambiguous)

    def test_resolve_platform_status_returns_online_when_only_completed_maintenance(self) -> None:
        payload = {
            "incidents": [],
            "maintenances": [
                {
                    "id": 99,
                    "maintenance_status": "complete",
                    "updates": [{"content": "<p>Maintenance finished.</p>"}],
                }
            ],
        }

        status, context, ambiguous = _resolve_platform_status(payload)

        self.assertEqual(status.value, "ONLINE")
        self.assertIsNone(context)
        self.assertFalse(ambiguous)


if __name__ == "__main__":
    unittest.main()
