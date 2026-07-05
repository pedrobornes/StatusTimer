"""Ollama-backed ambiguity resolver for telemetry probe edge cases."""

from __future__ import annotations

import logging
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from clients.ollama_client import OllamaClient
from config.settings import settings
from models.telemetry import TelemetryStatus
from pipeline.json_utils import extract_json_object
from scrapers.probe_models import ProbeOutcome

logger = logging.getLogger(__name__)

TELEMETRY_ANALYSIS_PROMPT = """You are StatusTimer TELEMETRY_ANALYZER.
Interpret the public infrastructure notice below and return strict JSON only.

Rules:
1. status must be exactly one of: ONLINE, DOWN, MAINTENANCE.
2. incident_summary must be one concise sentence (max 220 characters).
3. If the notice is informational with no outage, use status ONLINE.
4. Do not invent facts not present in the notice.

GAME: {game_name}
PLATFORM: {platform}
RAW_NOTICE:
{raw_notice}
"""


class TelemetryAnalysisOutput(BaseModel):
    status: Literal["ONLINE", "DOWN", "MAINTENANCE"]
    incident_summary: str = Field(min_length=1)

    @field_validator("incident_summary")
    @classmethod
    def normalize_summary(cls, value: str) -> str:
        return value.strip()


class TelemetryAnalyzer:
    def __init__(self, ollama_client: OllamaClient | None = None) -> None:
        self._ollama = ollama_client or OllamaClient()

    def resolve_probe(
        self,
        *,
        game_name: str,
        platform: str,
        outcome: ProbeOutcome,
    ) -> ProbeOutcome:
        if not outcome.needs_ollama_review:
            return outcome

        if not settings.ollama_enabled:
            logger.info(
                "Ollama disabled; keeping deterministic probe status for %s",
                game_name,
            )
            return outcome

        try:
            analysis = self._analyze_notice(
                game_name=game_name,
                platform=platform,
                raw_notice=outcome.context or "",
            )
            return ProbeOutcome(
                status=TelemetryStatus(analysis.status),
                latency_ms=outcome.latency_ms,
                data_source=outcome.data_source,
                context=analysis.incident_summary,
                ambiguous=False,
            )
        except Exception:
            logger.exception(
                "Ollama telemetry analysis failed for %s. Keeping probe status.",
                game_name,
            )
            return outcome

    def _analyze_notice(
        self,
        *,
        game_name: str,
        platform: str,
        raw_notice: str,
    ) -> TelemetryAnalysisOutput:
        prompt = TELEMETRY_ANALYSIS_PROMPT.format(
            game_name=game_name,
            platform=platform,
            raw_notice=raw_notice.strip() or "NO_NOTICE_PROVIDED",
        )
        raw_response = self._ollama.generate_json(prompt)
        parsed = extract_json_object(raw_response)
        return TelemetryAnalysisOutput.model_validate(parsed)
