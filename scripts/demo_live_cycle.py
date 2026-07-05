"""One-shot verbose harvest cycle for live pipeline inspection."""

from __future__ import annotations

import logging
import sys

from clients.backend_client import BackendClient
from main import run_harvest_cycle
from pipeline.context_pipeline import retrieve_game_context
from pipeline.skill_router import SkillRouter, resolve_skill_type

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger("demo-live-cycle")

_original_execute = SkillRouter.execute


def _verbose_execute(self: SkillRouter, event):  # type: ignore[no-untyped-def]
    skill_type = resolve_skill_type(event)
    context_hits = retrieve_game_context(
        event.game_tag,
        query=event.plain_text[:240],
        store=self._context_store,
    )
    logger.info(
        "SKILL CONTEXT | game=%s | skill=%s | chunks=%s",
        event.game_tag,
        skill_type.value,
        len(context_hits),
    )
    for index, hit in enumerate(context_hits[:3], start=1):
        preview = hit.chunk.text.replace("\n", " ")[:120]
        logger.info(
            "  chunk[%s] score=%.3f | %s",
            index,
            hit.score,
            preview,
        )

    result = _original_execute(self, event)
    logger.info(
        "SKILL RESULT | game=%s | skill=%s | fallback=%s",
        event.game_tag,
        result.skill_type.value,
        result.used_fallback,
    )

    if result.incident_output is not None:
        logger.info(
            "  incident summary=%s | status=%s | actionable=%s",
            result.incident_output.summary[:200],
            result.incident_output.status,
            result.incident_output.is_actionable,
        )
    if result.patch_note_output is not None:
        logger.info(
            "  patch title=%s | bullets=%s",
            result.patch_note_output.title[:80],
            result.patch_note_output.summary_markdown[:200].replace("\n", " | "),
        )
    if result.release_output is not None:
        logger.info(
            "  release title=%s | features=%s | platforms=%s | window=%s",
            result.release_output.title[:80],
            result.release_output.features,
            result.release_output.platforms,
            result.release_output.launch_window,
        )

    return result


SkillRouter.execute = _verbose_execute  # type: ignore[method-assign]


def main() -> None:
    logger.info("=== LIVE DEMO: single harvest cycle (verbose) ===")
    logger.info("Ollama model: deepseek-coder-v2:16b via %s", "http://localhost:11434")
    report = run_harvest_cycle(BackendClient())
    logger.info("=== CYCLE SUMMARY ===")
    logger.info("backend_reachable=%s", report.backend_reachable)
    logger.info("releases_prepared=%s release_sync_ok=%s", report.releases_prepared, report.release_sync.success)
    logger.info("telemetry_prepared=%s telemetry_sync_ok=%s", report.telemetry_prepared, report.telemetry_sync.success)
    logger.info(
        "platform_scraped=%s platform_pushed=%s context_chunks=%s intel_sync_ok=%s",
        report.platform_events_scraped,
        report.platform_events_pushed,
        report.context_chunks_indexed,
        report.platform_intel_sync.success,
    )


if __name__ == "__main__":
    main()
