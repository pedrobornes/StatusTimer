"""Shared probe result models for multi-platform telemetry harvesters."""

from __future__ import annotations

from dataclasses import dataclass

from models.telemetry import TelemetrySource, TelemetryStatus


@dataclass(frozen=True)
class ProbeOutcome:
    """Normalized result from a platform-specific status probe."""

    status: TelemetryStatus
    latency_ms: int
    data_source: TelemetrySource
    context: str | None = None
    ambiguous: bool = False

    @property
    def is_ambiguous(self) -> bool:
        return self.ambiguous and bool(self.context and self.context.strip())
