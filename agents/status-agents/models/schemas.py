"""Shared Pydantic schemas for agent payloads."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ServiceCategory(str, Enum):
    GAMING = "GAMING"
    SOCIAL = "SOCIAL"
    STREAMING = "STREAMING"


class ServiceStatusResult(BaseModel):
    service_name: str = Field(alias="serviceName")
    category: ServiceCategory
    is_up: bool = Field(alias="isUp")
    last_checked: datetime = Field(alias="lastChecked")

    model_config = {"populate_by_name": True}


class GamingNewsPayload(BaseModel):
    title: str
    content: str
    game_tag: str = Field(alias="gameTag")

    model_config = {"populate_by_name": True}
