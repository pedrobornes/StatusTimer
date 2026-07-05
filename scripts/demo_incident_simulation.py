"""Simulate an active platform incident through INCIDENT_SKILL end-to-end."""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone

from clients.backend_client import BackendClient
from clients.ollama_client import OllamaClient
from config.settings import settings
from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.context_pipeline import format_context_blocks, ingest_events_into_context_store, retrieve_game_context
from pipeline.json_utils import extract_json_object
from pipeline.skill_models import IncidentSkillOutput, SkillType
from pipeline.skill_prompts import build_incident_prompt
from pipeline.skill_router import SkillRouter, resolve_skill_type
from pipeline.sync_router import dispatch_skill_result

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    stream=sys.stdout,
    force=True,
)
logger = logging.getLogger("incident-simulation")

SIMULATED_INCIDENT_TEXT = """
[Riot Games Service Status] Valorant - Login & Authentication
Status: MAJOR OUTAGE (Investigating)
Regions impacted: NA, BR, LATAM
Started: 2026-07-05T09:42:00Z

Engineering is investigating widespread login failures affecting player authentication
and matchmaking queue entry. Error codes RIFT-63 and VAN -81 are being reported across
North America and Latin America shards. Match history and store services remain operational.
Players currently in-game are unaffected. Next update expected within 30 minutes.
""".strip()


class CapturingOllamaClient(OllamaClient):
    """Ollama client that stores the last raw JSON response for demo logging."""

    last_raw_response: str = ""

    def generate_json(self, prompt: str) -> str:
        raw = super().generate_json(prompt)
        self.last_raw_response = raw
        return raw


def build_simulated_valorant_incident() -> ScrapedFeedEvent:
    return ScrapedFeedEvent(
        source=FeedSource.RIOT,
        kind=FeedEventKind.INCIDENT,
        external_id="sim-valorant-login-outage-20260705",
        game_tag="valorant",
        title="[SIMULATION] Valorant Login & Authentication Major Outage",
        plain_text=SIMULATED_INCIDENT_TEXT,
        published_at=datetime.now(timezone.utc),
        source_url="https://status.riotgames.com/simulation/valorant-login",
    )


def main() -> None:
    event = build_simulated_valorant_incident()
    logger.info("=== PHASE 14 CLOSURE: INCIDENT_SKILL SIMULATION ===")
    logger.info("Injected event | source=%s | kind=%s | game=%s", event.source.value, event.kind.value, event.game_tag)
    logger.info("Title: %s", event.title)

    skill_type = resolve_skill_type(event)
    logger.info("Router decision -> %s", skill_type.value)
    if skill_type != SkillType.INCIDENT_SKILL:
        raise RuntimeError(f"Expected INCIDENT_SKILL, got {skill_type.value}")

    indexed_chunks, context_store = ingest_events_into_context_store([event])
    logger.info("Context store indexed %s chunk(s) for simulation event", indexed_chunks)

    context_hits = retrieve_game_context(event.game_tag, query=event.plain_text[:240], store=context_store)
    context_block = format_context_blocks(context_hits)
    logger.info("RAG retrieved %s context chunk(s)", len(context_hits))
    for index, hit in enumerate(context_hits[:3], start=1):
        preview = hit.chunk.text.replace("\n", " ")[:140]
        logger.info("  chunk[%s] score=%.3f | %s", index, hit.score, preview)

    logger.info("INCIDENT_SKILL prompt preview (first 400 chars):")
    prompt_preview = build_incident_prompt(
        title=event.title,
        game_tag=event.game_tag,
        source=event.source.value,
        context=context_block,
    )
    logger.info("%s...", prompt_preview[:400])

    ollama = CapturingOllamaClient()
    logger.info("Calling Ollama model=%s at %s", settings.ollama_model, settings.ollama_base_url)

    router = SkillRouter(context_store=context_store, ollama_client=ollama)
    logger.info("Routing event [%s] to INCIDENT_SKILL", event.game_tag)
    execution = router.execute(event)

    parsed_dict = extract_json_object(ollama.last_raw_response)
    skill_json = IncidentSkillOutput.model_validate(parsed_dict)

    logger.info("--- OLLAMA RAW JSON ---")
    print(json.dumps(parsed_dict, indent=2, ensure_ascii=False))
    logger.info("--- PARSED INCIDENT_SKILL OUTPUT ---")
    print(skill_json.model_dump_json(indent=2))
    logger.info(
        "SkillRouter | skill=%s | fallback=%s | actionable=%s | status=%s | summary_len=%s",
        execution.skill_type.value,
        execution.used_fallback,
        skill_json.is_actionable,
        skill_json.status,
        len(skill_json.summary),
    )

    client = BackendClient()
    dispatch_report = dispatch_skill_result(client, event, execution)

    if dispatch_report.skipped:
        logger.warning("Dispatch SKIPPED: %s", dispatch_report.skip_reason)
        return

    telemetry = dispatch_report.telemetry_push
    news = dispatch_report.news_push

    if telemetry is not None:
        status = "OK" if telemetry.success else "FAILED"
        logger.info(
            "DUAL PUSH [telemetry] POST /api/v1/internal/status/sync -> HTTP %s (%s)",
            telemetry.status_code,
            status,
        )
    if news is not None:
        status = "OK" if news.success else "FAILED"
        logger.info(
            "DUAL PUSH [news] POST /api/v1/internal/news -> HTTP %s (%s)",
            news.status_code,
            status,
        )

    logger.info("=== SIMULATION COMPLETE | dual_push_success=%s ===", dispatch_report.success)


if __name__ == "__main__":
    main()
