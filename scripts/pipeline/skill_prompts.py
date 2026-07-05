"""Prompt templates for contextual LLM skills."""

from __future__ import annotations

from config.settings import settings

INCIDENT_SKILL_PROMPT = """You are StatusTimer INCIDENT_SKILL.
Use ONLY the CONTEXT facts below. Do not invent details.

Rules:
1. Write one short tactical outage summary (max 280 characters).
2. If the context lacks definitive status evidence, set:
   - summary to "{fallback}"
   - actionable to false
   - status to "UNKNOWN"
3. Return valid JSON only with keys: summary, status, actionable.
4. status must be one of: DOWN, MAINTENANCE, ONLINE, UNKNOWN.

EVENT:
title: {title}
game_tag: {game_tag}
source: {source}

CONTEXT:
{context}
"""

PATCH_NOTE_SKILL_PROMPT = """You are StatusTimer PATCH_NOTE_SKILL.
Use ONLY the CONTEXT facts below. Do not invent details.

Rules:
1. Extract structural patch intelligence with markdown bullet points.
2. Preserve numeric balance changes, bug fixes, and infrastructure updates.
3. Return valid JSON only with keys: title, summary_markdown, game_tag.
4. summary_markdown must use markdown bullet points.

EVENT:
title: {title}
game_tag: {game_tag}
source: {source}

CONTEXT:
{context}
"""

RELEASE_SKILL_PROMPT = """You are StatusTimer RELEASE_SKILL.
Use ONLY the CONTEXT facts below. Do not invent details.

Rules:
1. Extract gameplay features, target platforms, and launch windows when present.
2. Return valid JSON only with keys:
   title, summary_markdown, game_tag, features, platforms, launch_window
3. features and platforms must be JSON arrays of strings.
4. launch_window may be null when unknown.

EVENT:
title: {title}
game_tag: {game_tag}
source: {source}

CONTEXT:
{context}
"""


def build_incident_prompt(
    *,
    title: str,
    game_tag: str,
    source: str,
    context: str,
) -> str:
    return INCIDENT_SKILL_PROMPT.format(
        fallback=settings.incident_fallback_message,
        title=title,
        game_tag=game_tag,
        source=source,
        context=context or "NO_CONTEXT_AVAILABLE",
    )


def build_patch_note_prompt(
    *,
    title: str,
    game_tag: str,
    source: str,
    context: str,
) -> str:
    return PATCH_NOTE_SKILL_PROMPT.format(
        title=title,
        game_tag=game_tag,
        source=source,
        context=context or "NO_CONTEXT_AVAILABLE",
    )


def build_release_prompt(
    *,
    title: str,
    game_tag: str,
    source: str,
    context: str,
) -> str:
    return RELEASE_SKILL_PROMPT.format(
        title=title,
        game_tag=game_tag,
        source=source,
        context=context or "NO_CONTEXT_AVAILABLE",
    )
