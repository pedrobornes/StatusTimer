"""DTOs for third-party social network server status ingestion."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ServiceCategory(str, Enum):
    SOCIAL = "SOCIAL"


class ServiceStatusPayload(BaseModel):
    """Compatible with Spring Boot UpsertServerStatusRequest."""

    model_config = ConfigDict(populate_by_name=True)

    service_name: str = Field(alias="serviceName")
    service_slug: str = Field(alias="serviceSlug")
    category: ServiceCategory = ServiceCategory.SOCIAL
    is_up: bool = Field(alias="isUp")
    last_checked: datetime = Field(alias="lastChecked")


class SyncServiceStatusRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    entries: list[ServiceStatusPayload]
