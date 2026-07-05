"""Structured outputs expected from contextual LLM skills."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from config.settings import settings


class SkillType(str, Enum):
    INCIDENT_SKILL = "INCIDENT_SKILL"
    PATCH_NOTE_SKILL = "PATCH_NOTE_SKILL"
    RELEASE_SKILL = "RELEASE_SKILL"


class IncidentSkillOutput(BaseModel):
    summary: str = Field(min_length=1)
    status: Literal["DOWN", "MAINTENANCE", "ONLINE", "UNKNOWN"] = "UNKNOWN"
    actionable: bool = False

    @field_validator("summary")
    @classmethod
    def normalize_summary(cls, value: str) -> str:
        return value.strip()

    @property
    def is_actionable(self) -> bool:
        fallback = settings.incident_fallback_message.strip()
        return self.actionable and self.summary.strip().upper() != fallback.upper()


class PatchNoteSkillOutput(BaseModel):
    title: str = Field(min_length=1)
    summary_markdown: str = Field(min_length=1)
    game_tag: str = Field(min_length=1)


class ReleaseSkillOutput(BaseModel):
    title: str = Field(min_length=1)
    summary_markdown: str = Field(min_length=1)
    game_tag: str = Field(min_length=1)
    features: list[str] = Field(default_factory=list)
    platforms: list[str] = Field(default_factory=list)
    launch_window: str | None = None


@dataclass(frozen=True)
class SkillExecutionResult:
    skill_type: SkillType
    incident_output: IncidentSkillOutput | None = None
    patch_note_output: PatchNoteSkillOutput | None = None
    release_output: ReleaseSkillOutput | None = None
    used_fallback: bool = False
