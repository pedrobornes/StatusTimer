from models.enums import GameGenre, Platform
from models.normalization import normalize_genre, normalize_platform
from models.schemas import (
    GameReleasePayload,
    PatchNotePayload,
    PlatformRelease,
    SyncGamesRequest,
)

__all__ = [
    "GameGenre",
    "GameReleasePayload",
    "PatchNotePayload",
    "Platform",
    "PlatformRelease",
    "SyncGamesRequest",
    "normalize_genre",
    "normalize_platform",
]
