"""Tests for social platform connectivity probes."""

from __future__ import annotations

import unittest
from unittest.mock import patch

from scrapers.social_status import (
    MONITORED_SOCIAL_TARGETS,
    fetch_social_status_payloads,
    probe_social_target,
)


class SocialStatusHarvesterTests(unittest.TestCase):
    def test_monitored_targets_include_x(self) -> None:
        slugs = {target.slug for target in MONITORED_SOCIAL_TARGETS}
        self.assertIn("x", slugs)
        self.assertIn("youtube", slugs)

    @patch("scrapers.social_status.probe_tcp_latency", return_value=42)
    def test_probe_social_target_online(self, _mock_probe: object) -> None:
        target = MONITORED_SOCIAL_TARGETS[0]
        self.assertTrue(probe_social_target(target))

    @patch("scrapers.social_status.probe_tcp_latency", return_value=None)
    def test_probe_social_target_offline(self, _mock_probe: object) -> None:
        target = MONITORED_SOCIAL_TARGETS[0]
        self.assertFalse(probe_social_target(target))

    @patch("scrapers.social_status.probe_tcp_latency", return_value=12)
    def test_fetch_social_status_payloads(self, _mock_probe: object) -> None:
        payloads = fetch_social_status_payloads()
        self.assertEqual(len(payloads), len(MONITORED_SOCIAL_TARGETS))
        self.assertTrue(all(entry.is_up for entry in payloads))


if __name__ == "__main__":
    unittest.main()
