"""Typed results for backend HTTP operations."""

from dataclasses import dataclass


@dataclass(frozen=True)
class PushResult:
    success: bool
    status_code: int | None = None
    error_message: str | None = None
    attempts: int = 1

    @property
    def is_endpoint_missing(self) -> bool:
        return self.status_code == 404

    @property
    def is_backend_unreachable(self) -> bool:
        return self.status_code is None
