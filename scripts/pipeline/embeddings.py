"""Lightweight sparse text embeddings for local similarity search."""

from __future__ import annotations

import math
import re
from collections import Counter

_TOKEN_PATTERN = re.compile(r"[a-z0-9][a-z0-9'-]{1,}")
_STOP_WORDS = {
    "about",
    "after",
    "also",
    "been",
    "from",
    "have",
    "into",
    "that",
    "the",
    "this",
    "with",
    "will",
    "your",
}


def tokenize(text: str) -> list[str]:
    normalized = text.lower()
    tokens = _TOKEN_PATTERN.findall(normalized)
    return [token for token in tokens if token not in _STOP_WORDS and len(token) > 2]


def embed_text(text: str) -> dict[str, float]:
    """Build a normalized bag-of-words vector without external ML dependencies."""
    counts = Counter(tokenize(text))
    if not counts:
        return {}

    norm = math.sqrt(sum(weight * weight for weight in counts.values()))
    if norm == 0:
        return {}

    return {token: weight / norm for token, weight in counts.items()}


def cosine_similarity(
    left_vector: dict[str, float],
    right_vector: dict[str, float],
) -> float:
    if not left_vector or not right_vector:
        return 0.0

    shared_tokens = set(left_vector).intersection(right_vector)
    if not shared_tokens:
        return 0.0

    return sum(left_vector[token] * right_vector[token] for token in shared_tokens)
