"""Tests for run_phase_safe resilience integration."""

import unittest
from unittest.mock import patch

from main import run_phase_safe
from pipeline.cycle_resilience import (
    CycleDegradationTracker,
    HarvestPhaseCircuitBreaker,
    PhaseCriticality,
)


class RunPhaseSafeResilienceTests(unittest.TestCase):
    def test_run_phase_safe_records_failure_and_returns_fallback(self) -> None:
        tracker = CycleDegradationTracker(cycle_id="cycle-test")
        breaker = HarvestPhaseCircuitBreaker()

        def failing_phase() -> str:
            raise RuntimeError("sync failed")

        result = run_phase_safe(
            "catalog_sync",
            failing_phase,
            "fallback",
            cycle_id="cycle-test",
            degradation_tracker=tracker,
            circuit_breaker=breaker,
        )

        self.assertEqual(result, "fallback")
        self.assertEqual(len(tracker.failures), 1)
        self.assertEqual(tracker.failures[0].phase_name, "catalog_sync")
        self.assertEqual(tracker.failures[0].criticality, PhaseCriticality.STANDARD)

    def test_run_phase_safe_skips_when_circuit_is_open(self) -> None:
        tracker = CycleDegradationTracker(cycle_id="cycle-test")
        breaker = HarvestPhaseCircuitBreaker()

        with patch("pipeline.cycle_resilience.settings") as mock_settings:
            mock_settings.phase_circuit_failure_threshold = 1
            mock_settings.phase_circuit_open_seconds = 60
            breaker.record_failure("platform_feeds_pipeline")

            called = False

            def _should_not_run() -> str:
                nonlocal called
                called = True
                return "ok"

            result = run_phase_safe(
                "platform_feeds_pipeline",
                _should_not_run,
                "skipped",
                cycle_id="cycle-test",
                degradation_tracker=tracker,
                circuit_breaker=breaker,
            )

        self.assertEqual(result, "skipped")
        self.assertFalse(called)
        self.assertEqual(tracker.skipped_phases, ["platform_feeds_pipeline"])


if __name__ == "__main__":
    unittest.main()
