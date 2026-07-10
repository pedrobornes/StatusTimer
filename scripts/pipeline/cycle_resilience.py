"""Harvest cycle degradation tracking and per-phase circuit breaker."""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from threading import Lock

from config.settings import settings


class PhaseCriticality(str, Enum):
    CRITICAL = "critical"
    STANDARD = "standard"
    ENRICHMENT = "enrichment"


PHASE_CRITICALITY: dict[str, PhaseCriticality] = {
    "catalog_preload": PhaseCriticality.ENRICHMENT,
    "tier_maintenance": PhaseCriticality.STANDARD,
    "on_demand_jobs": PhaseCriticality.CRITICAL,
    "scheduled_harvest": PhaseCriticality.CRITICAL,
    "release_sync": PhaseCriticality.STANDARD,
    "catalog_sync": PhaseCriticality.STANDARD,
    "twitch_catalog_sync": PhaseCriticality.STANDARD,
    "social_status_sync": PhaseCriticality.STANDARD,
    "platform_feeds_pipeline": PhaseCriticality.ENRICHMENT,
    "fetch_releases": PhaseCriticality.STANDARD,
    "fetch_catalog": PhaseCriticality.STANDARD,
    "fetch_dynamic_catalog": PhaseCriticality.STANDARD,
    "fetch_social": PhaseCriticality.STANDARD,
    "fetch_platform_events": PhaseCriticality.ENRICHMENT,
}


def generate_cycle_id() -> str:
    return f"cycle-{uuid.uuid4().hex[:12]}"


def resolve_phase_criticality(phase_name: str) -> PhaseCriticality:
    return PHASE_CRITICALITY.get(phase_name, PhaseCriticality.STANDARD)


@dataclass(frozen=True)
class PhaseFailureRecord:
    phase_name: str
    criticality: PhaseCriticality
    error_summary: str
    duration_ms: float


@dataclass
class CycleDegradationTracker:
    cycle_id: str
    failures: list[PhaseFailureRecord] = field(default_factory=list)
    skipped_phases: list[str] = field(default_factory=list)

    def record_failure(
        self,
        *,
        phase_name: str,
        criticality: PhaseCriticality,
        error_summary: str,
        duration_ms: float,
    ) -> None:
        self.failures.append(
            PhaseFailureRecord(
                phase_name=phase_name,
                criticality=criticality,
                error_summary=error_summary,
                duration_ms=duration_ms,
            )
        )

    def record_skip(self, phase_name: str) -> None:
        self.skipped_phases.append(phase_name)

    @property
    def is_degraded(self) -> bool:
        return bool(self.failures or self.skipped_phases)

    @property
    def is_critically_degraded(self) -> bool:
        return any(
            record.criticality is PhaseCriticality.CRITICAL for record in self.failures
        )

    def build_summary(self) -> dict[str, object]:
        critical_failures = [
            record.phase_name
            for record in self.failures
            if record.criticality is PhaseCriticality.CRITICAL
        ]
        non_critical_failures = [
            record.phase_name
            for record in self.failures
            if record.criticality is not PhaseCriticality.CRITICAL
        ]
        root_causes = [
            {
                "phase": record.phase_name,
                "criticality": record.criticality.value,
                "error": record.error_summary,
            }
            for record in self.failures
        ]
        return {
            "cycle_id": self.cycle_id,
            "degraded": self.is_degraded,
            "critically_degraded": self.is_critically_degraded,
            "failed_phases": [record.phase_name for record in self.failures],
            "skipped_phases": list(self.skipped_phases),
            "critical_failures": critical_failures,
            "non_critical_failures": non_critical_failures,
            "root_causes": root_causes,
        }


@dataclass
class _PhaseCircuitState:
    failure_count: int = 0
    opened_at: float | None = None


class HarvestPhaseCircuitBreaker:
    """Short-lived circuit breaker for recurring harvest phase failures."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._phases: dict[str, _PhaseCircuitState] = {}

    def should_skip(self, phase_name: str) -> bool:
        with self._lock:
            state = self._phases.setdefault(phase_name, _PhaseCircuitState())
            if state.opened_at is None:
                return False

            elapsed = time.monotonic() - state.opened_at
            if elapsed >= settings.phase_circuit_open_seconds:
                state.opened_at = None
                state.failure_count = 0
                return False
            return True

    def record_success(self, phase_name: str) -> None:
        with self._lock:
            state = self._phases.setdefault(phase_name, _PhaseCircuitState())
            state.failure_count = 0
            state.opened_at = None

    def record_failure(self, phase_name: str) -> bool:
        """Record a failure. Returns True when the circuit just opened."""
        with self._lock:
            state = self._phases.setdefault(phase_name, _PhaseCircuitState())
            state.failure_count += 1
            if (
                state.failure_count >= settings.phase_circuit_failure_threshold
                and state.opened_at is None
            ):
                state.opened_at = time.monotonic()
                return True
            return False


harvest_phase_circuit = HarvestPhaseCircuitBreaker()
