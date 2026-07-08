"""Steam AppID quarantine: tolerate transient 404s, blacklist after repeated failures."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from config.database import get_engine
from config.settings import settings

logger = logging.getLogger(__name__)


def _as_bool(value: object) -> bool:
    """Coerce a DB flag to bool. MySQL BIT(1) comes back as bytes (b'\\x00'/b'\\x01'),
    and a non-empty bytes object is always truthy, so bool() alone misreads b'\\x00'
    as True. Inspect the actual byte value instead."""
    if isinstance(value, (bytes, bytearray)):
        return any(value)
    return bool(value)


def should_skip_steam_app(app_id: int) -> bool:
    """Return True when a blacklisted AppID is not yet due for weekly re-scan."""
    if app_id <= 0:
        return True

    query = text(
        "SELECT steam_blacklisted, steam_blacklist_rescan_at "
        "FROM games WHERE steam_app_id = :app_id LIMIT 1"
    )

    try:
        with get_engine().connect() as connection:
            row = connection.execute(query, {"app_id": app_id}).mappings().first()
    except SQLAlchemyError as error:
        logger.warning("Steam quarantine lookup failed for app %s: %s", app_id, error)
        return False

    if row is None:
        return False

    blacklisted = _as_bool(row.get("steam_blacklisted"))
    if not blacklisted:
        return False

    rescan_at = row.get("steam_blacklist_rescan_at")
    if rescan_at is None:
        logger.debug("Skipping blacklisted Steam app %s (no rescan scheduled)", app_id)
        return True

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if isinstance(rescan_at, datetime) and now < rescan_at:
        logger.debug(
            "Skipping blacklisted Steam app %s until rescan at %s",
            app_id,
            rescan_at,
        )
        return True

    logger.info("Steam app %s due for weekly quarantine re-scan", app_id)
    return False


def record_steam_app_success(app_id: int) -> None:
    """Reset quarantine counters after a successful Steam players lookup."""
    if app_id <= 0:
        return

    statement = text(
        "UPDATE games SET "
        "steam_consecutive_404_count = 0, "
        "steam_blacklisted = 0, "
        "steam_blacklist_rescan_at = NULL "
        "WHERE steam_app_id = :app_id"
    )

    try:
        with get_engine().begin() as connection:
            result = connection.execute(statement, {"app_id": app_id})
            if result.rowcount:
                logger.info("Steam app %s recovered from quarantine", app_id)
    except SQLAlchemyError as error:
        logger.warning("Steam quarantine success reset failed for app %s: %s", app_id, error)


def record_steam_app_404(app_id: int) -> None:
    """Increment consecutive 404 count; blacklist after threshold failures."""
    if app_id <= 0:
        return

    threshold = settings.steam_404_blacklist_threshold
    rescan_days = settings.steam_blacklist_rescan_days
    rescan_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=rescan_days)

    increment_statement = text(
        "UPDATE games SET "
        "steam_consecutive_404_count = steam_consecutive_404_count + 1, "
        "steam_blacklisted = CASE "
        "WHEN steam_consecutive_404_count + 1 >= :threshold THEN 1 "
        "ELSE steam_blacklisted END, "
        "steam_blacklist_rescan_at = CASE "
        "WHEN steam_consecutive_404_count + 1 >= :threshold THEN :rescan_at "
        "WHEN steam_blacklisted = 1 THEN :rescan_at "
        "ELSE steam_blacklist_rescan_at END "
        "WHERE steam_app_id = :app_id"
    )

    try:
        with get_engine().begin() as connection:
            result = connection.execute(
                increment_statement,
                {"app_id": app_id, "threshold": threshold, "rescan_at": rescan_at},
            )
            if not result.rowcount:
                return

            count_row = connection.execute(
                text(
                    "SELECT steam_consecutive_404_count, steam_blacklisted "
                    "FROM games WHERE steam_app_id = :app_id LIMIT 1"
                ),
                {"app_id": app_id},
            ).mappings().first()

        if count_row is None:
            return

        count = int(count_row.get("steam_consecutive_404_count") or 0)
        blacklisted = _as_bool(count_row.get("steam_blacklisted"))

        if blacklisted and count >= threshold:
            logger.warning(
                "Steam app %s blacklisted after %s consecutive 404(s); "
                "next re-scan scheduled at %s",
                app_id,
                count,
                rescan_at,
            )
        else:
            logger.info(
                "Steam app %s recorded 404 (%s/%s before blacklist)",
                app_id,
                count,
                threshold,
            )
    except SQLAlchemyError as error:
        logger.warning("Steam quarantine 404 update failed for app %s: %s", app_id, error)
