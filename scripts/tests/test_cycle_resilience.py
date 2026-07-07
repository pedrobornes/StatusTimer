"""Tests for harvest cycle degradation and phase circuit breaker."""

import time
import unittest
from unittest.mock import patch

from pipeline.cycle_resilience import (
    CycleDegradationTracker,
    HarvestPhaseCircuitBreaker,
    PhaseCriticality,
    generate_cycle_id,
    harvest_phase_circuit,
    resolve_phase_criticality,
)


class CycleResilienceTests(unittest.TestCase):
    def test_generate_cycle_id_has_prefix(self) -> None:
        cycle_id = generate_cycle_id()
        self.assertTrue(cycle_id.startswith("cycle-"))
        self.assertGreater(len(cycle_id), len("cycle-"))

    def test_resolve_phase_criticality_defaults_to_standard(self) -> None:
        self.assertEqual(resolve_phase_criticality("unknown_phase"), PhaseCriticality.STANDARD)
        self.assertEqual(resolve_phase_criticality("scheduled_harvest"), PhaseCriticality.CRITICAL)

    def test_degradation_tracker_marks_critical_failures(self) -> None:
        tracker = CycleDegradationTracker(cycle_id="cycle-test")
        tracker.record_failure(
            phase_name="scheduled_harvest",
            criticality=PhaseCriticality.CRITICAL,
            error_summary="backend timeout",
            duration_ms=12.5,
        )

        summary = tracker.build_summary()
        self.assertTrue(tracker.is_degraded)
        self.assertTrue(tracker.is_critically_degraded)
        self.assertEqual(summary["critical_failures"], ["scheduled_harvest"])
        self.assertEqual(summary["root_causes"][0]["error"], "backend timeout")

    def test_degradation_tracker_records_skipped_phases(self) -> None:
        tracker = CycleDegradationTracker(cycle_id="cycle-test")
        tracker.record_skip("fetch_catalog")

        summary = tracker.build_summary()
        self.assertTrue(tracker.is_degraded)
        self.assertFalse(tracker.is_critically_degraded)
        self.assertEqual(summary["skipped_phases"], ["fetch_catalog"])

    def test_phase_circuit_opens_after_threshold(self) -> None:
        breaker = HarvestPhaseCircuitBreaker()
        with patch("pipeline.cycle_resilience.settings") as mock_settings:
            mock_settings.phase_circuit_failure_threshold = 2
            mock_settings.phase_circuit_open_seconds = 60

            self.assertFalse(breaker.should_skip("catalog_sync"))
            self.assertFalse(breaker.record_failure("catalog_sync"))
            self.assertTrue(breaker.record_failure("catalog_sync"))
            self.assertTrue(breaker.should_skip("catalog_sync"))

    def test_phase_circuit_closes_after_cooldown(self) -> None:
        breaker = HarvestPhaseCircuitBreaker()
        with patch("pipeline.cycle_resilience.settings") as mock_settings:
            mock_settings.phase_circuit_failure_threshold = 1
            mock_settings.phase_circuit_open_seconds = 0.05

            breaker.record_failure("release_sync")
            self.assertTrue(breaker.should_skip("release_sync"))
            time.sleep(0.06)
            self.assertFalse(breaker.should_skip("release_sync"))

    def test_phase_circuit_success_resets_failures(self) -> None:
        breaker = HarvestPhaseCircuitBreaker()
        with patch("pipeline.cycle_resilience.settings") as mock_settings:
            mock_settings.phase_circuit_failure_threshold = 3
            mock_settings.phase_circuit_open_seconds = 60

            breaker.record_failure("social_status_sync")
            breaker.record_failure("social_status_sync")
            breaker.record_success("social_status_sync")
            breaker.record_failure("social_status_sync")
            self.assertFalse(breaker.should_skip("social_status_sync"))

    def test_shared_harvest_phase_circuit_is_singleton(self) -> None:
        self.assertIsInstance(harvest_phase_circuit, HarvestPhaseCircuitBreaker)


if __name__ == "__main__":
    unittest.main()
