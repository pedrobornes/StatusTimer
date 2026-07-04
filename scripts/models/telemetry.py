"""Telemetry payloads for game server status sync."""

from enum import Enum

from pydantic import BaseModel, Field


class TelemetryStatus(str, Enum):
    ONLINE = "ONLINE"
    MAINTENANCE = "MAINTENANCE"
    DOWN = "DOWN"


class TelemetrySource(str, Enum):
    STEAM_API = "STEAM_API"
    NETWORK_PROBE = "NETWORK_PROBE"
    STATUS_PAGE = "STATUS_PAGE"


class GameTelemetryPayload(BaseModel):
    game_slug: str = Field(alias="gameSlug", min_length=1)
    status: TelemetryStatus
    latency_ms: int = Field(alias="latencyMs", ge=0)
    data_source: TelemetrySource = Field(
        default=TelemetrySource.NETWORK_PROBE,
        alias="dataSource",
    )

    model_config = {"populate_by_name": True}


class SyncTelemetryRequest(BaseModel):
    entries: list[GameTelemetryPayload] = Field(min_length=1)

    model_config = {"populate_by_name": True}
