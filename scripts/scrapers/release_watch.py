"""Upcoming release watch with Ollama validation for vendor date shifts."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from datetime import date
from typing import Literal

import requests
from pydantic import BaseModel, Field, field_validator

from clients.ollama_client import OllamaClient
from config.settings import settings
from pipeline.json_utils import extract_json_object

logger = logging.getLogger(__name__)

RELEASE_VALIDATION_PROMPT = """You are StatusTimer RELEASE_WATCH.
Validate whether the vendor notice confirms, delays, or keeps the release window.

Rules:
1. Return valid JSON only with keys:
   release_date, changed, incident_summary
2. release_date must be ISO format YYYY-MM-DD or null when unknown/TBA.
3. changed is true only when the notice confirms a different date than CURRENT_DATE.
4. incident_summary is one sentence explaining the decision.

GAME: {game_name}
CURRENT_DATE: {current_date}
VENDOR_NOTICE:
{vendor_notice}
"""

_DATE_PATTERN = re.compile(
    r"\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b",
)


@dataclass(frozen=True)
class VendorReleaseHint:
    game_name: str
    slug: str
    current_release_date: date | None
    source_label: str
    notice_text: str


class ReleaseValidationOutput(BaseModel):
    release_date: str | None = None
    changed: bool = False
    incident_summary: str = Field(min_length=1)

    @field_validator("release_date")
    @classmethod
    def normalize_release_date(cls, value: str | None) -> str | None:
        if value is None:
            return None

        trimmed = value.strip()
        if not trimmed or trimmed.upper() == "TBA":
            return None

        parsed = date.fromisoformat(trimmed)
        return parsed.isoformat()


class ReleaseWatchAnalyzer:
    def __init__(self, ollama_client: OllamaClient | None = None) -> None:
        self._ollama = ollama_client or OllamaClient()

    def validate_hint(self, hint: VendorReleaseHint) -> ReleaseValidationOutput:
        if settings.ollama_enabled:
            try:
                return self._validate_with_ollama(hint)
            except Exception:
                logger.exception(
                    "Ollama release validation failed for %s. Using deterministic parse.",
                    hint.slug,
                )

        return self._deterministic_validation(hint)

    def _validate_with_ollama(self, hint: VendorReleaseHint) -> ReleaseValidationOutput:
        current = (
            hint.current_release_date.isoformat()
            if hint.current_release_date is not None
            else "TBA"
        )
        prompt = RELEASE_VALIDATION_PROMPT.format(
            game_name=hint.game_name,
            current_date=current,
            vendor_notice=hint.notice_text,
        )
        raw_response = self._ollama.generate_json(prompt)
        parsed = extract_json_object(raw_response)
        return ReleaseValidationOutput.model_validate(parsed)

    def _deterministic_validation(self, hint: VendorReleaseHint) -> ReleaseValidationOutput:
        extracted = _extract_iso_date(hint.notice_text)
        current_iso = (
            hint.current_release_date.isoformat()
            if hint.current_release_date is not None
            else None
        )
        changed = extracted is not None and extracted != current_iso

        if changed and extracted is not None:
            summary = (
                f"{hint.game_name} release window updated to {extracted} "
                f"via {hint.source_label}."
            )
            return ReleaseValidationOutput(
                release_date=extracted,
                changed=True,
                incident_summary=summary,
            )

        if current_iso is not None:
            return ReleaseValidationOutput(
                release_date=current_iso,
                changed=False,
                incident_summary=(
                    f"{hint.game_name} release date remains {current_iso} "
                    f"according to {hint.source_label}."
                ),
            )

        return ReleaseValidationOutput(
            release_date=None,
            changed=False,
            incident_summary=(
                f"No certified release date change detected for {hint.game_name}."
            ),
        )


def fetch_gta_vi_vendor_hint(session: requests.Session | None = None) -> VendorReleaseHint:
    """Collect a vendor notice for GTA VI from Rockstar news HTML."""
    http = session or requests.Session()
    notice_text = _DEFAULT_GTA_VI_NOTICE
    source_label = "Rockstar official"

    try:
        response = http.get(
            "https://www.rockstargames.com/newswire",
            timeout=settings.request_timeout_seconds,
            headers={"User-Agent": "StatusTimer-Harvester/1.0 (+release-watch)"},
        )
        response.raise_for_status()
        html = response.text
        if "Grand Theft Auto VI" in html or "GTA VI" in html:
            snippet = _extract_html_snippet(html, "Grand Theft Auto VI")
            if snippet:
                notice_text = snippet
    except requests.RequestException as error:
        logger.warning("Rockstar newswire fetch failed: %s", error)

    return VendorReleaseHint(
        game_name="GTA VI",
        slug="gta-vi",
        current_release_date=date(2026, 11, 19),
        source_label=source_label,
        notice_text=notice_text,
    )


_DEFAULT_GTA_VI_NOTICE = (
    "Rockstar Games previously announced Grand Theft Auto VI for "
    "November 19, 2026 on PlayStation 5 and Xbox Series X|S."
)


def _extract_iso_date(text: str) -> str | None:
    match = _DATE_PATTERN.search(text)
    if not match:
        return None

    year, month, day = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return None


def _extract_html_snippet(html: str, marker: str) -> str | None:
    index = html.find(marker)
    if index < 0:
        return None

    start = max(0, index - 180)
    end = min(len(html), index + 420)
    snippet = re.sub(r"<[^>]+>", " ", html[start:end])
    snippet = re.sub(r"\s+", " ", snippet).strip()
    return snippet or None
