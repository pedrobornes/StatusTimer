"""Automatic scrape-tier rebalancing based on Twitch audience trends."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from config.database import get_engine
from config.settings import settings
from scrapers.status import (
    ALWAYS_TIER_1,
    TIER_HIGH,
    TIER_LOW,
    TIER_MEDIUM,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TierTrendDecision:
    promotions: tuple[str, ...]
    demotions: tuple[str, ...]


@dataclass
class TierTrendReport:
    ran: bool
    reason: str
    promotions: tuple[str, ...] = ()
    demotions: tuple[str, ...] = ()
    always_tier1_enforced: int = 0
    tier_counts: dict[str, int] | None = None


def classify_scrape_tier(
    slug: str,
    *,
    current_rank: int | None,
    trend_promoted: bool = False,
) -> int:
    """
    Classify a game into Tier 1 / 2 / 3 based on current Twitch rank.

    Tier 1 (high): ALWAYS_TIER_1 or trend-promoted Top-20 (3-day rule).
    Tier 2 (medium): rank 1-50 (includes Top 20 waiting for promotion).
    Tier 3 (low): rank > 50 or unknown.
    """
    if slug in ALWAYS_TIER_1 or trend_promoted:
        return TIER_HIGH

    if current_rank is None or current_rank <= 0:
        return TIER_LOW

    if current_rank <= settings.tier_trend_demote_below_rank:
        return TIER_MEDIUM

    return TIER_LOW


def describe_tier_bucket(tier: int) -> str:
    if tier == TIER_HIGH:
        return "tier_1_high"
    if tier == TIER_MEDIUM:
        return "tier_2_medium"
    return "tier_3_low"


def load_current_twitch_ranks() -> dict[str, int]:
    query = text(
        "SELECT slug, twitch_rank FROM games "
        "WHERE twitch_rank IS NOT NULL AND twitch_rank > 0"
    )
    ranks: dict[str, int] = {}
    try:
        with get_engine().connect() as connection:
            rows = connection.execute(query).all()
    except SQLAlchemyError:
        logger.exception("Failed to load current twitch ranks.")
        return ranks

    for row in rows:
        slug = row[0]
        rank = row[1]
        if isinstance(slug, str) and isinstance(rank, int):
            ranks[slug] = rank
    return ranks


def load_all_game_slugs() -> list[str]:
    query = text("SELECT slug FROM games")
    try:
        with get_engine().connect() as connection:
            rows = connection.execute(query).all()
    except SQLAlchemyError:
        logger.exception("Failed to load game slugs for tier sync.")
        return []

    return [row[0] for row in rows if isinstance(row[0], str) and row[0]]


def build_tier_assignments(
    *,
    today: date | None = None,
    ranks: dict[str, int] | None = None,
) -> dict[str, int]:
    today = today or _utc_today()
    current_ranks = ranks if ranks is not None else load_current_twitch_ranks()
    state = _load_json(_state_path())
    active_promotions = _active_trend_promotions(_load_trend_promotions(state), today=today)

    assignments: dict[str, int] = {}
    for slug in load_all_game_slugs():
        assignments[slug] = classify_scrape_tier(
            slug,
            current_rank=current_ranks.get(slug),
            trend_promoted=slug in active_promotions,
        )

    for slug in ALWAYS_TIER_1:
        assignments[slug] = TIER_HIGH

    return assignments


def summarize_tier_counts(assignments: dict[str, int]) -> dict[str, int]:
    summary = {"tier_1_high": 0, "tier_2_medium": 0, "tier_3_low": 0}
    for tier in assignments.values():
        summary[describe_tier_bucket(tier)] += 1
    return summary


def sync_scrape_tiers_from_current_ranks() -> tuple[int, dict[str, int]]:
    assignments = build_tier_assignments()
    applied = _apply_scrape_tier_updates(assignments)
    counts = summarize_tier_counts(assignments)
    logger.info(
        "Tier bucket sync: tier_1=%s tier_2=%s tier_3=%s (db_updates=%s)",
        counts["tier_1_high"],
        counts["tier_2_medium"],
        counts["tier_3_low"],
        applied,
    )
    return applied, counts


def _utc_today() -> date:
    return datetime.now(timezone.utc).date()


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        logger.exception("Failed to read tier state file: %s", path)
        return {}
    return payload if isinstance(payload, dict) else {}


def _save_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")


def _history_path() -> Path:
    return Path(settings.tier_rank_history_file)


def _state_path() -> Path:
    return Path(settings.tier_trend_state_file)


def _prune_history(history: dict[str, Any], *, keep_days: int) -> dict[str, dict[str, int]]:
    cutoff = _utc_today() - timedelta(days=keep_days)
    pruned: dict[str, dict[str, int]] = {}
    for day_key, ranks in history.items():
        if not isinstance(ranks, dict):
            continue
        try:
            day = date.fromisoformat(day_key)
        except ValueError:
            continue
        if day < cutoff:
            continue
        cleaned: dict[str, int] = {}
        for slug, rank in ranks.items():
            if isinstance(slug, str) and isinstance(rank, int) and rank > 0:
                cleaned[slug] = rank
        pruned[day_key] = cleaned
    return pruned


def _load_trend_promotions(state: dict[str, Any]) -> dict[str, str]:
    raw = state.get("trend_promotions")
    if not isinstance(raw, dict):
        return {}
    promotions: dict[str, str] = {}
    for slug, until in raw.items():
        if isinstance(slug, str) and isinstance(until, str):
            promotions[slug] = until
    return promotions


def _active_trend_promotions(promotions: dict[str, str], *, today: date) -> set[str]:
    active: set[str] = set()
    for slug, until_text in promotions.items():
        try:
            until = date.fromisoformat(until_text)
        except ValueError:
            continue
        if until >= today:
            active.add(slug)
    return active


def is_trend_promoted_tier1(slug: str, *, today: date | None = None) -> bool:
    today = today or _utc_today()
    state = _load_json(_state_path())
    promotions = _load_trend_promotions(state)
    return slug in _active_trend_promotions(promotions, today=today)


def record_daily_twitch_rank_snapshot(*, today: date | None = None) -> int:
    """Persist one daily audience-rank snapshot from the games table."""
    today = today or _utc_today()
    day_key = today.isoformat()
    query = text(
        "SELECT slug, twitch_rank FROM games "
        "WHERE twitch_rank IS NOT NULL AND twitch_rank > 0"
    )

    snapshot: dict[str, int] = {}
    try:
        with get_engine().connect() as connection:
            rows = connection.execute(query).all()
    except SQLAlchemyError:
        logger.exception("Failed to load twitch_rank snapshot from games table.")
        return 0

    for row in rows:
        slug = row[0]
        rank = row[1]
        if isinstance(slug, str) and isinstance(rank, int):
            snapshot[slug] = rank

    history_path = _history_path()
    history = _prune_history(_load_json(history_path), keep_days=settings.tier_rank_history_keep_days)
    history[day_key] = snapshot
    _save_json(history_path, history)
    logger.info("Recorded Twitch rank snapshot for %s (%s games).", day_key, len(snapshot))
    return len(snapshot)


def calculate_tier_trends(
    *,
    today: date | None = None,
    lookback_days: int | None = None,
) -> TierTrendDecision:
    """
    Analyze the last N daily snapshots and decide promotions/demotions.

    Promotion: non-fixed game ranked <= top 20 on every lookback day.
    Demotion: trend-promoted tier-1 game ranked > 50 (or missing) every lookback day.
    """
    today = today or _utc_today()
    days_required = lookback_days or settings.tier_trend_lookback_days
    history = _prune_history(_load_json(_history_path()), keep_days=settings.tier_rank_history_keep_days)

    recent_days = sorted(
        day for day in history.keys() if day <= today.isoformat()
    )[-days_required:]

    if len(recent_days) < days_required:
        logger.info(
            "Tier trend analysis skipped: only %s/%s daily snapshots available.",
            len(recent_days),
            days_required,
        )
        return TierTrendDecision(promotions=(), demotions=())

    state = _load_json(_state_path())
    active_promotions = _active_trend_promotions(_load_trend_promotions(state), today=today)

    all_slugs: set[str] = set()
    for day_key in recent_days:
        all_slugs.update(history[day_key].keys())

    promotions: list[str] = []
    for slug in sorted(all_slugs):
        if slug in ALWAYS_TIER_1 or slug in active_promotions:
            continue
        ranks = [history[day_key].get(slug, settings.tier_trend_demote_below_rank + 1) for day_key in recent_days]
        if all(rank <= settings.tier_trend_promote_top_rank for rank in ranks):
            promotions.append(slug)

    demotions: list[str] = []
    for slug in sorted(active_promotions):
        if slug in ALWAYS_TIER_1:
            continue
        ranks = [history[day_key].get(slug, settings.tier_trend_demote_below_rank + 1) for day_key in recent_days]
        if all(rank > settings.tier_trend_demote_below_rank for rank in ranks):
            demotions.append(slug)

    return TierTrendDecision(
        promotions=tuple(promotions),
        demotions=tuple(demotions),
    )


def should_run_tier_rebalance(*, today: date | None = None) -> bool:
    today = today or _utc_today()
    state = _load_json(_state_path())
    last_run_raw = state.get("last_rebalance_date")
    if not isinstance(last_run_raw, str):
        return True

    try:
        last_run = date.fromisoformat(last_run_raw)
    except ValueError:
        return True

    if settings.tier_rebalance_force_monday and today.weekday() == 0 and last_run < today:
        return True

    return (today - last_run).days >= settings.tier_rebalance_interval_days


def _apply_scrape_tier_updates(updates: dict[str, int]) -> int:
    if not updates:
        return 0

    statement = text("UPDATE games SET scrape_tier = :tier WHERE slug = :slug")
    applied = 0
    try:
        with get_engine().begin() as connection:
            for slug, tier in updates.items():
                result = connection.execute(statement, {"slug": slug, "tier": tier})
                applied += result.rowcount or 0
    except SQLAlchemyError:
        logger.exception("Failed to apply scrape_tier updates to games table.")
        return 0
    return applied


def enforce_always_tier_one_slugs() -> int:
    updates = {slug: 1 for slug in ALWAYS_TIER_1}
    applied = _apply_scrape_tier_updates(updates)
    if applied:
        logger.info("Enforced ALWAYS_TIER_1 on %s game(s).", applied)
    return applied


def apply_tier_rebalance(*, today: date | None = None, force: bool = False) -> TierTrendReport:
    today = today or _utc_today()

    if not force and not should_run_tier_rebalance(today=today):
        _, counts = sync_scrape_tiers_from_current_ranks()
        enforced = enforce_always_tier_one_slugs()
        return TierTrendReport(
            ran=False,
            reason="interval_not_elapsed",
            always_tier1_enforced=enforced,
            tier_counts=counts,
        )

    decision = calculate_tier_trends(today=today)
    state = _load_json(_state_path())
    promotions = _load_trend_promotions(state)

    promotion_until = (
        today + timedelta(days=settings.tier_trend_promotion_days)
    ).isoformat()

    for slug in decision.promotions:
        promotions[slug] = promotion_until

    for slug in decision.demotions:
        promotions.pop(slug, None)

    # Drop expired promotions
    active = _active_trend_promotions(promotions, today=today)
    promotions = {slug: until for slug, until in promotions.items() if slug in active}

    state["trend_promotions"] = promotions
    state["last_rebalance_date"] = today.isoformat()
    _save_json(_state_path(), state)

    applied, counts = sync_scrape_tiers_from_current_ranks()

    logger.info(
        "Tier rebalance complete: promotions=%s demotions=%s db_updates=%s buckets=%s",
        list(decision.promotions),
        list(decision.demotions),
        applied,
        counts,
    )
    return TierTrendReport(
        ran=True,
        reason="rebalanced",
        promotions=decision.promotions,
        demotions=decision.demotions,
        always_tier1_enforced=len(ALWAYS_TIER_1),
        tier_counts=counts,
    )


def load_db_scrape_tiers() -> dict[str, int]:
    query = text("SELECT slug, scrape_tier FROM games")
    tiers: dict[str, int] = {}
    try:
        with get_engine().connect() as connection:
            rows = connection.execute(query).all()
    except SQLAlchemyError:
        logger.exception("Failed to load scrape tiers from games table.")
        return tiers

    for row in rows:
        slug = row[0]
        tier = row[1]
        if isinstance(slug, str) and isinstance(tier, int) and tier in {1, 2, 3}:
            tiers[slug] = tier
    return tiers


def bootstrap_tier_resolution_cache() -> None:
    """Warm in-memory tier cache used by resolve_effective_scrape_tier."""
    from scrapers.status import refresh_effective_scrape_tier_cache

    refresh_effective_scrape_tier_cache(
        load_db_scrape_tiers(),
        load_current_twitch_ranks(),
    )


def run_tier_maintenance(*, force_rebalance: bool = False) -> TierTrendReport:
    record_daily_twitch_rank_snapshot()
    report = apply_tier_rebalance(force=force_rebalance)
    bootstrap_tier_resolution_cache()
    return report
