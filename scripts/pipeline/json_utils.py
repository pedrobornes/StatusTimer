"""Shared JSON extraction helpers for LLM responses."""

from __future__ import annotations

import json
import re


_JSON_FENCE_PATTERN = re.compile(
    r"```(?:json)?\s*(.*?)\s*```",
    re.DOTALL | re.IGNORECASE,
)


def extract_json_object(raw_text: str) -> dict[str, object]:
    """Parse a JSON object from a raw LLM response."""
    candidate = raw_text.strip()
    if not candidate:
        raise ValueError("LLM response is empty.")

    fence_match = _JSON_FENCE_PATTERN.search(candidate)
    if fence_match:
        candidate = fence_match.group(1).strip()

    parsed = json.loads(candidate)
    if not isinstance(parsed, dict):
        raise ValueError("LLM response JSON must be an object.")
    return parsed
