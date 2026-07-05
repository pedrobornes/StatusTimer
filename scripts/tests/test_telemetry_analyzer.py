"""Tests for Ollama telemetry ambiguity resolver."""

import unittest
from unittest.mock import Mock, patch

from models.telemetry import TelemetrySource, TelemetryStatus
from pipeline.telemetry_analyzer import TelemetryAnalyzer
from scrapers.probe_models import ProbeOutcome


class TelemetryAnalyzerTests(unittest.TestCase):
    @patch("pipeline.telemetry_analyzer.settings.ollama_enabled", True)
    def test_resolve_probe_uses_ollama_for_ambiguous_notice(self) -> None:
        ollama = Mock()
        ollama.generate_json.return_value = (
            '{"status":"DOWN","incident_summary":"Valorant login services are disrupted."}'
        )
        analyzer = TelemetryAnalyzer(ollama_client=ollama)

        outcome = ProbeOutcome(
            status=TelemetryStatus.MAINTENANCE,
            latency_ms=42,
            data_source=TelemetrySource.STATUS_PAGE,
            context="Login issues affecting NA players.",
            ambiguous=True,
        )

        resolved = analyzer.resolve_probe(
            game_name="Valorant",
            platform="riot",
            outcome=outcome,
        )

        self.assertEqual(resolved.status, TelemetryStatus.DOWN)
        self.assertEqual(
            resolved.context,
            "Valorant login services are disrupted.",
        )
        ollama.generate_json.assert_called_once()

    @patch("pipeline.telemetry_analyzer.settings.ollama_enabled", False)
    def test_resolve_probe_keeps_outcome_when_ollama_disabled(self) -> None:
        analyzer = TelemetryAnalyzer(ollama_client=Mock())
        outcome = ProbeOutcome(
            status=TelemetryStatus.MAINTENANCE,
            latency_ms=10,
            data_source=TelemetrySource.STATUS_PAGE,
            context="Scheduled maintenance window.",
            ambiguous=True,
        )

        resolved = analyzer.resolve_probe(
            game_name="Valorant",
            platform="riot",
            outcome=outcome,
        )

        self.assertEqual(resolved.status, TelemetryStatus.MAINTENANCE)


if __name__ == "__main__":
    unittest.main()
