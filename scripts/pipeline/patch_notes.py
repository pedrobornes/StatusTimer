"""Legacy patch-note helper kept for backward-compatible imports."""

from pipeline.skill_router import SkillRouter

_router = SkillRouter()


def summarize_patch_notes(raw_text: str, *, game_tag: str = "unknown", title: str = "Patch update") -> str:
    """
    Backward-compatible wrapper that routes raw text through PATCH_NOTE_SKILL.

    Prefer SkillRouter directly for new integrations.
    """
    from datetime import datetime, timezone

    from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent

    event = ScrapedFeedEvent(
        source=FeedSource.STEAM,
        kind=FeedEventKind.NEWS,
        external_id="legacy-patch-note",
        game_tag=game_tag,
        title=title,
        plain_text=raw_text,
        published_at=datetime.now(timezone.utc),
    )
    execution = _router.execute(event)
    if execution.patch_note_output is None:
        return raw_text.strip()
    return execution.patch_note_output.summary_markdown
