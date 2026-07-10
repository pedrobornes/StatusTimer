"""SQLAlchemy engine factory for direct MySQL access from the harvester."""

from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from config.mysql_url import normalize_mysql_sqlalchemy_url
from config.settings import settings

_engine: Engine | None = None


def get_engine() -> Engine:
    global _engine

    if _engine is None:
        _engine = create_engine(
            normalize_mysql_sqlalchemy_url(settings.sqlalchemy_database_url),
            pool_pre_ping=True,
            pool_recycle=3600,
        )

    return _engine
