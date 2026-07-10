"""Normalize Railway / cloud MySQL URLs for SQLAlchemy + PyMySQL."""

from __future__ import annotations


def normalize_mysql_sqlalchemy_url(url: str) -> str:
    normalized = url.strip()

    for legacy_prefix in ("mysql+mysqldb://", "mysql://"):
        if normalized.startswith(legacy_prefix):
            normalized = f"mysql+pymysql://{normalized[len(legacy_prefix):]}"
            break

    if "charset=" not in normalized:
        separator = "&" if "?" in normalized else "?"
        normalized = f"{normalized}{separator}charset=utf8mb4"

    return normalized
