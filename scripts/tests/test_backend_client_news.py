"""Tests for backend news ingest guards."""

from datetime import datetime, timezone
from unittest.mock import Mock

from clients.backend_client import BackendClient
from clients.http_result import PushResult
from models.schemas import PatchNotePayload


def test_push_patch_note_skips_stale_items() -> None:
    client = BackendClient()
    client._post = Mock(return_value=PushResult(success=True, status_code=201))

    stale = PatchNotePayload(
        title="Old patch",
        content="Ancient update.",
        gameTag="valorant",
        publishedAt=datetime(2020, 1, 1, tzinfo=timezone.utc),
    )

    result = client.push_patch_note(stale)

    assert result.success is True
    assert result.status_code == 204
    client._post.assert_not_called()
