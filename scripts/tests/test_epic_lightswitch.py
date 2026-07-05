"""Tests for Epic Lightswitch and status-page probe mapping."""

import unittest
from unittest.mock import Mock

from models.telemetry import TelemetryStatus
from scrapers.epic_lightswitch import _extract_fortnite_status, _map_lightswitch_status, probe_fortnite_status


class EpicLightswitchTests(unittest.TestCase):
    def test_extract_fortnite_status_from_bulk_payload(self) -> None:
        payload = [
            {"serviceName": "Other", "status": "UP"},
            {"serviceName": "Fortnite", "status": "DOWN", "message": "Matchmaking degraded"},
        ]
        record = _extract_fortnite_status(payload)
        self.assertIsNotNone(record)
        assert record is not None
        self.assertEqual(record["serviceName"], "Fortnite")

    def test_map_lightswitch_status(self) -> None:
        self.assertEqual(_map_lightswitch_status({"status": "UP"}), TelemetryStatus.ONLINE)
        self.assertEqual(_map_lightswitch_status({"status": "DOWN"}), TelemetryStatus.DOWN)
        self.assertEqual(
            _map_lightswitch_status({"status": "DEGRADED"}),
            TelemetryStatus.MAINTENANCE,
        )

    def test_status_page_fallback_when_lightswitch_unauthorized(self) -> None:
        session = Mock()

        def _get(url, **kwargs):
            if "lightswitch" in url:
                response = Mock(status_code=401)
                response.raise_for_status.side_effect = Exception("401")
                return response

            return Mock(
                status_code=200,
                raise_for_status=Mock(),
                json=Mock(
                    return_value={
                        "status": {
                            "indicator": "minor",
                            "description": "All systems operational",
                        }
                    }
                ),
            )

        session.get.side_effect = _get
        outcome = probe_fortnite_status(session, timeout=5)

        self.assertIsNotNone(outcome)
        assert outcome is not None
        self.assertEqual(outcome.status, TelemetryStatus.ONLINE)


if __name__ == "__main__":
    unittest.main()
