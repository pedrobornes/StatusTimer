"""Tests for contextual skill routing."""

import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from models.feed_events import FeedEventKind, FeedSource, ScrapedFeedEvent
from pipeline.skill_models import SkillType
from pipeline.skill_router import SkillRouter, resolve_skill_type


class SkillRoutingTests(unittest.TestCase):
    def test_resolve_skill_type_for_incident(self) -> None:
        event = self._event(kind=FeedEventKind.INCIDENT, text="Login outage detected.")
        self.assertEqual(resolve_skill_type(event), SkillType.INCIDENT_SKILL)

    def test_resolve_skill_type_for_release_news(self) -> None:
        event = self._event(
            kind=FeedEventKind.NEWS,
            text="Official launch window announced for next month.",
        )
        self.assertEqual(resolve_skill_type(event), SkillType.RELEASE_SKILL)

    def test_resolve_skill_type_for_patch_news(self) -> None:
        event = self._event(
            kind=FeedEventKind.NEWS,
            text="Weapon balance adjustments and bug fixes.",
        )
        self.assertEqual(resolve_skill_type(event), SkillType.PATCH_NOTE_SKILL)

    @patch("pipeline.skill_router.OllamaClient.generate_json")
    def test_incident_skill_fallback_on_ollama_failure(self, mock_generate) -> None:
        mock_generate.side_effect = RuntimeError("offline")
        router = SkillRouter(context_store=None)
        event = self._event(kind=FeedEventKind.INCIDENT, text="Possible outage.")

        result = router.execute(event)
        self.assertTrue(result.used_fallback)
        self.assertIsNotNone(result.incident_output)
        assert result.incident_output is not None
        self.assertFalse(result.incident_output.is_actionable)

    def _event(self, *, kind: FeedEventKind, text: str) -> ScrapedFeedEvent:
        return ScrapedFeedEvent(
            source=FeedSource.RIOT,
            kind=kind,
            external_id="event-1",
            game_tag="valorant",
            title="Test event",
            plain_text=text,
            published_at=datetime(2026, 7, 5, tzinfo=timezone.utc),
        )


if __name__ == "__main__":
    unittest.main()
