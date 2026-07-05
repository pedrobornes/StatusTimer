"""Prompt routing engine for context-aware LLM skills."""

from __future__ import annotations

import logging
import re

from clients.ollama_client import OllamaClient
from config.settings import settings
from models.feed_events import FeedEventKind, ScrapedFeedEvent
from pipeline.context_pipeline import format_context_blocks, retrieve_game_context
from pipeline.context_store import LocalContextStore
from pipeline.json_utils import extract_json_object
from pipeline.skill_models import (
    IncidentSkillOutput,
    PatchNoteSkillOutput,
    ReleaseSkillOutput,
    SkillExecutionResult,
    SkillType,
)
from pipeline.skill_prompts import (
    build_incident_prompt,
    build_patch_note_prompt,
    build_release_prompt,
)

logger = logging.getLogger(__name__)

_RELEASE_HINT_PATTERN = re.compile(
    r"\b(release date|launch|coming soon|early access|pre-order|available now|launch window)\b",
    re.IGNORECASE,
)


class SkillRouter:
    """Routes scraped events to strict contextual skills backed by local RAG."""

    def __init__(
        self,
        *,
        context_store: LocalContextStore | None = None,
        ollama_client: OllamaClient | None = None,
    ) -> None:
        self._context_store = context_store
        self._ollama = ollama_client or OllamaClient()

    def execute(self, event: ScrapedFeedEvent) -> SkillExecutionResult:
        skill_type = resolve_skill_type(event)
        context_block = self._build_context_block(event)
        logger.info(
            "Routing event [%s] to %s",
            event.game_tag,
            skill_type.value,
        )

        try:
            if skill_type == SkillType.INCIDENT_SKILL:
                return self._run_incident_skill(event, context_block)
            if skill_type == SkillType.PATCH_NOTE_SKILL:
                return self._run_patch_note_skill(event, context_block)
            return self._run_release_skill(event, context_block)
        except Exception:
            logger.exception(
                "Skill execution failed for %s. Using deterministic fallback.",
                skill_type.value,
            )
            return self._fallback_result(skill_type, event, context_block)

    def _build_context_block(self, event: ScrapedFeedEvent) -> str:
        query = event.plain_text[:240]
        context_hits = retrieve_game_context(
            event.game_tag,
            query=query,
            store=self._context_store,
        )
        context_block = format_context_blocks(context_hits)
        if context_block:
            return context_block

        return "\n".join(
            [
                "FACT 1 | score=1.000",
                event.title,
                event.plain_text,
            ]
        )

    def _run_incident_skill(
        self,
        event: ScrapedFeedEvent,
        context_block: str,
    ) -> SkillExecutionResult:
        prompt = build_incident_prompt(
            title=event.title,
            game_tag=event.game_tag,
            source=event.source.value,
            context=context_block,
        )
        raw_response = self._ollama.generate_json(prompt)
        parsed = IncidentSkillOutput.model_validate(extract_json_object(raw_response))
        return SkillExecutionResult(
            skill_type=SkillType.INCIDENT_SKILL,
            incident_output=parsed,
            used_fallback=False,
        )

    def _run_patch_note_skill(
        self,
        event: ScrapedFeedEvent,
        context_block: str,
    ) -> SkillExecutionResult:
        prompt = build_patch_note_prompt(
            title=event.title,
            game_tag=event.game_tag,
            source=event.source.value,
            context=context_block,
        )
        raw_response = self._ollama.generate_json(prompt)
        parsed = PatchNoteSkillOutput.model_validate(extract_json_object(raw_response))
        return SkillExecutionResult(
            skill_type=SkillType.PATCH_NOTE_SKILL,
            patch_note_output=parsed,
            used_fallback=False,
        )

    def _run_release_skill(
        self,
        event: ScrapedFeedEvent,
        context_block: str,
    ) -> SkillExecutionResult:
        prompt = build_release_prompt(
            title=event.title,
            game_tag=event.game_tag,
            source=event.source.value,
            context=context_block,
        )
        raw_response = self._ollama.generate_json(prompt)
        parsed = ReleaseSkillOutput.model_validate(extract_json_object(raw_response))
        return SkillExecutionResult(
            skill_type=SkillType.RELEASE_SKILL,
            release_output=parsed,
            used_fallback=False,
        )

    def _fallback_result(
        self,
        skill_type: SkillType,
        event: ScrapedFeedEvent,
        context_block: str,
    ) -> SkillExecutionResult:
        if skill_type == SkillType.INCIDENT_SKILL:
            return SkillExecutionResult(
                skill_type=skill_type,
                incident_output=IncidentSkillOutput(
                    summary=settings.incident_fallback_message,
                    status="UNKNOWN",
                    actionable=False,
                ),
                used_fallback=True,
            )

        if skill_type == SkillType.PATCH_NOTE_SKILL:
            return SkillExecutionResult(
                skill_type=skill_type,
                patch_note_output=PatchNoteSkillOutput(
                    title=event.title,
                    summary_markdown=_plain_text_to_bullets(event.plain_text),
                    game_tag=event.game_tag,
                ),
                used_fallback=True,
            )

        return SkillExecutionResult(
            skill_type=skill_type,
            release_output=ReleaseSkillOutput(
                title=event.title,
                summary_markdown=_plain_text_to_bullets(event.plain_text),
                game_tag=event.game_tag,
                features=[],
                platforms=[],
                launch_window=None,
            ),
            used_fallback=True,
        )


def resolve_skill_type(event: ScrapedFeedEvent) -> SkillType:
    if event.kind == FeedEventKind.INCIDENT:
        return SkillType.INCIDENT_SKILL

    haystack = f"{event.title} {event.plain_text}"
    if _RELEASE_HINT_PATTERN.search(haystack):
        return SkillType.RELEASE_SKILL

    return SkillType.PATCH_NOTE_SKILL


def _plain_text_to_bullets(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return "- No structured context available."

    bullet_lines = []
    for line in lines:
        if line.startswith("FACT "):
            continue
        bullet_lines.append(f"- {line}")

    return "\n".join(bullet_lines) if bullet_lines else "- No structured context available."
