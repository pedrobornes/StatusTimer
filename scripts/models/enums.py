"""Canonical enums aligned with the StatusTimer release ingestion contract."""

from enum import Enum


class GameGenre(str, Enum):
    SHOOTER = "Shooter"
    RPG = "RPG"
    SURVIVAL = "Survival"
    ACTION = "Action"
    SPORTS_RACING = "Sports/Racing"
    STRATEGY = "Strategy"


class Platform(str, Enum):
    PC = "PC"
    PS5 = "PS5"
    XBOX = "XBOX"
    SWITCH = "SWITCH"
    SWITCH_2 = "SWITCH_2"
