"""Plain-text extraction helpers for HTML-heavy platform feeds."""

from __future__ import annotations

import re
from html import unescape
from html.parser import HTMLParser


class _PlainTextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._parts: list[str] = []

    def handle_data(self, data: str) -> None:
        if data.strip():
            self._parts.append(data.strip())

    def get_text(self) -> str:
        return " ".join(self._parts)


_WHITESPACE_PATTERN = re.compile(r"\s+")


def plain_text_from_html(value: str) -> str:
    """Strip HTML tags and collapse whitespace into readable plain text."""
    if not value.strip():
        return ""

    parser = _PlainTextExtractor()
    parser.feed(unescape(value))
    parser.close()

    normalized = _WHITESPACE_PATTERN.sub(" ", parser.get_text()).strip()
    return normalized


def normalize_plain_text(value: str) -> str:
    """Normalize already-plain feed text."""
    if not value.strip():
        return ""

    return _WHITESPACE_PATTERN.sub(" ", unescape(value)).strip()
