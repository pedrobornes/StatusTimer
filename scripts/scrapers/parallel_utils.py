"""Thread-pool helpers for parallel I/O-bound scraper work."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from typing import Callable, TypeVar

T = TypeVar("T")
R = TypeVar("R")

PARALLEL_HTTP_MAX_WORKERS = 10


def run_parallel(
    items: list[T],
    fn: Callable[[T], R],
    *,
    max_workers: int = PARALLEL_HTTP_MAX_WORKERS,
) -> list[R]:
    """Run *fn* over *items* concurrently, preserving input order."""
    if not items:
        return []

    workers = min(max_workers, len(items))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        return list(executor.map(fn, items))
