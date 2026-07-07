"""Simulate on-demand activation for games across scrape tiers."""

from __future__ import annotations

import json
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import requests

BACKEND = "http://localhost:8080"
FRONTEND = "http://localhost:3000"

TEST_GAMES: tuple[tuple[str, int], ...] = (
    ("counter-strike-2", 1),
    ("elden-ring", 2),
    ("stardew-valley", 3),
)


@dataclass
class OnDemandStepResult:
    slug: str
    tier: int
    activated: bool
    job_queued: bool
    pending_after_activate: bool
    ready_after_harvest: bool
    seconds_to_ready: float | None
    frontend_gate_detected: bool


def get_ready(slug: str) -> bool:
    response = requests.get(
        f"{BACKEND}/api/v1/telemetry/{slug}/ready",
        timeout=15,
    )
    response.raise_for_status()
    return bool(response.json().get("ready"))


def activate(slug: str) -> dict:
    response = requests.get(f"{BACKEND}/api/v1/status/{slug}", timeout=30)
    response.raise_for_status()
    return response.json()


def frontend_shows_gate(slug: str) -> bool:
    response = requests.get(f"{FRONTEND}/status/{slug}", timeout=60)
    response.raise_for_status()
    html = response.text.lower()
    markers = (
        "looking for live server info",
        "pendingtelemetrygate",
        "we're checking",
    )
    return any(marker in html for marker in markers)


def poll_ready(slug: str, *, timeout_seconds: int = 120) -> tuple[bool, float]:
    started = time.monotonic()
    while time.monotonic() - started < timeout_seconds:
        if get_ready(slug):
            return True, time.monotonic() - started
        time.sleep(2)
    return False, time.monotonic() - started


def main() -> int:
    print("=== On-demand simulation (3 tiers) ===")
    activation_rows: list[dict] = []
    pending_checks: list[tuple[str, int, bool, bool]] = []

    for slug, tier in TEST_GAMES:
        activation = requests.post(
            f"{BACKEND}/api/v1/games/{slug}/activate",
            timeout=30,
        )
        activation.raise_for_status()
        payload = activation.json()
        activation_rows.append({"slug": slug, "tier": tier, **payload})

        activate(slug)
        pending = not get_ready(slug)
        gate = frontend_shows_gate(slug) if pending else False
        pending_checks.append((slug, tier, pending, gate))

        print(
            f"[activate] tier={tier} slug={slug} "
            f"jobQueued={payload.get('jobQueued')} pending={pending} gate={gate}"
        )

    print("\n[harvester] running single cycle (--once)...")
    project_root = Path(__file__).resolve().parent.parent
    harvest = subprocess.run(
        [sys.executable, str(project_root / "scripts" / "main.py"), "--once"],
        cwd=str(project_root),
        env={**dict(**__import__("os").environ), "PYTHONPATH": "scripts"},
        capture_output=True,
        text=True,
        timeout=600,
    )
    if harvest.returncode != 0:
        print(harvest.stderr[-4000:])
        print("Harvester cycle failed.")
        return 1

    results: list[OnDemandStepResult] = []
    for slug, tier in TEST_GAMES:
        ready, elapsed = poll_ready(slug)
        activation_row = next(row for row in activation_rows if row["slug"] == slug)
        _, _, pending, gate = next(item for item in pending_checks if item[0] == slug)
        results.append(
            OnDemandStepResult(
                slug=slug,
                tier=tier,
                activated=True,
                job_queued=bool(activation_row.get("jobQueued")),
                pending_after_activate=pending,
                ready_after_harvest=ready,
                seconds_to_ready=elapsed if ready else None,
                frontend_gate_detected=gate,
            )
        )
        print(
            f"[result] tier={tier} slug={slug} ready={ready} "
            f"elapsed={elapsed:.1f}s"
        )

    output_path = project_root / ".harvest_state" / "on-demand-simulation.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(
            {
                "activations": activation_rows,
                "results": [asdict(item) for item in results],
                "harvester_exit_code": harvest.returncode,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\nReport saved to {output_path}")

    all_ready = all(item.ready_after_harvest for item in results)
    return 0 if all_ready else 2


if __name__ == "__main__":
    raise SystemExit(main())
