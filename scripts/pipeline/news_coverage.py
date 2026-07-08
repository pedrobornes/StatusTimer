"""Helpers to prioritize games in the catalog that still lack news coverage."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass

from sqlalchemy import text

from config.database import get_engine

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class UncoveredNewsGame:
    slug: str
    steam_app_id: int
    game_name: str


@dataclass(frozen=True)
class RedditLinkedGame:
    slug: str
    game_name: str
    reddit_url: str


def fetch_games_with_reddit_links(limit: int = 12) -> tuple[RedditLinkedGame, ...]:
    if limit <= 0:
        return ()

    query = text(
        """
        SELECT g.slug, g.game_name, g.external_links_json
        FROM games g
        WHERE g.external_links_json IS NOT NULL
          AND g.external_links_json <> ''
          AND g.external_links_json <> '{}'
        ORDER BY
            CASE WHEN g.twitch_rank IS NULL THEN 1 ELSE 0 END,
            g.twitch_rank ASC,
            g.hype_count DESC,
            g.game_name ASC
        LIMIT :limit
        """
    )

    try:
        with get_engine().connect() as connection:
            rows = connection.execute(query, {"limit": limit}).fetchall()
    except Exception as error:
        logger.warning("Could not load Reddit-linked games from MySQL: %s", error)
        return ()

    linked: list[RedditLinkedGame] = []
    for row in rows:
        slug = str(row[0]).strip()
        game_name = str(row[1]).strip()
        raw_links = row[2]
        reddit_url = _extract_reddit_url(raw_links)
        if not slug or not game_name or reddit_url is None:
            continue
        linked.append(
            RedditLinkedGame(
                slug=slug,
                game_name=game_name,
                reddit_url=reddit_url,
            )
        )

    return tuple(linked)


def _extract_reddit_url(raw_links: object) -> str | None:
    if raw_links is None:
        return None

    if isinstance(raw_links, dict):
        value = raw_links.get("reddit")
        return str(value).strip() if isinstance(value, str) and value.strip() else None

    if isinstance(raw_links, str):
        text_value = raw_links.strip()
        if not text_value:
            return None
        try:
            payload = json.loads(text_value)
        except ValueError:
            return None
        if isinstance(payload, dict):
            value = payload.get("reddit")
            return str(value).strip() if isinstance(value, str) and value.strip() else None

    return None


def fetch_games_without_news(limit: int = 12) -> tuple[UncoveredNewsGame, ...]:
    """Return catalog games with a Steam app id but no rows in gaming_news."""
    if limit <= 0:
        return ()

    query = text(
        """
        SELECT g.slug, g.steam_app_id, g.game_name
        FROM games g
        LEFT JOIN gaming_news gn ON gn.game_tag = g.slug
        WHERE g.steam_app_id IS NOT NULL
          AND g.steam_app_id > 0
        GROUP BY g.id, g.slug, g.steam_app_id, g.game_name, g.twitch_rank, g.hype_count
        HAVING COUNT(gn.id) = 0
        ORDER BY
            CASE WHEN g.twitch_rank IS NULL THEN 1 ELSE 0 END,
            g.twitch_rank ASC,
            g.hype_count DESC,
            g.game_name ASC
        LIMIT :limit
        """
    )

    try:
        with get_engine().connect() as connection:
            rows = connection.execute(query, {"limit": limit}).fetchall()
    except Exception as error:
        logger.warning("Could not load uncovered news games from MySQL: %s", error)
        return ()

    uncovered: list[UncoveredNewsGame] = []
    for row in rows:
        slug = str(row[0]).strip()
        app_id = int(row[1])
        game_name = str(row[2]).strip()
        if not slug or app_id <= 0 or not game_name:
            continue
        uncovered.append(
            UncoveredNewsGame(
                slug=slug,
                steam_app_id=app_id,
                game_name=game_name,
            )
        )

    return tuple(uncovered)
