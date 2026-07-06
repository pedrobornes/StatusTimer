"""One-off catalog seed: CSV import or Steam Charts top-N into CATALOG layer."""

from __future__ import annotations

import argparse
import csv
import logging
import re
import sys
from pathlib import Path

import requests
from dotenv import load_dotenv

from clients.backend_client import BackendClient
from config.settings import settings
from models.catalog_schemas import GameCatalogEntryPayload, SyncGameCatalogRequest
from models.normalization import to_slug
from scrapers.steam_charts import (
    MANUAL_PROTECTED_SLUGS,
    build_catalog_entry,
    fetch_steam_app_name,
    fetch_steam_charts_ranks,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("seed-catalog")

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
NON_GAME_NAME_PATTERNS = (
    "soundtrack",
    "ost",
    "wallpaper",
    "demo only",
    "playtest",
    "beta access",
    "server software",
    "sdk",
    "toolkit",
    "editor",
)
STEAM_APP_DETAILS_URL = "https://store.steampowered.com/api/appdetails"
BATCH_SIZE = 50


def is_valid_slug(slug: str) -> bool:
    return bool(slug) and bool(SLUG_PATTERN.fullmatch(slug))


def looks_like_non_game(game_name: str) -> bool:
    lowered = game_name.strip().lower()
    return any(pattern in lowered for pattern in NON_GAME_NAME_PATTERNS)


def dedupe_entries(entries: list[GameCatalogEntryPayload]) -> list[GameCatalogEntryPayload]:
    seen: set[str] = set()
    unique: list[GameCatalogEntryPayload] = []

    for entry in entries:
        if entry.slug in seen or entry.slug in MANUAL_PROTECTED_SLUGS:
            continue
        seen.add(entry.slug)
        unique.append(entry)

    return unique


def load_csv_entries(csv_path: Path) -> list[GameCatalogEntryPayload]:
    if not csv_path.is_file():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    entries: list[GameCatalogEntryPayload] = []
    skipped = 0

    with csv_path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        required = {"slug", "game_name"}
        if not required.issubset(reader.fieldnames or set()):
            raise ValueError("CSV must include columns: slug, game_name")

        for row in reader:
            slug = to_slug((row.get("slug") or "").strip())
            game_name = (row.get("game_name") or "").strip()

            if not slug or not game_name:
                skipped += 1
                continue
            if not is_valid_slug(slug):
                logger.warning("Invalid slug skipped: %s", slug)
                skipped += 1
                continue
            if looks_like_non_game(game_name):
                logger.info("Non-game title skipped: %s", game_name)
                skipped += 1
                continue

            steam_raw = (row.get("steam_app_id") or "").strip()
            steam_app_id = int(steam_raw) if steam_raw.isdigit() else None
            featured = (row.get("featured") or "").strip().lower() in {"1", "true", "yes"}

            entries.append(
                GameCatalogEntryPayload(
                    slug=slug,
                    game_name=game_name,
                    steam_app_id=steam_app_id,
                    logo_url=None,
                    cover_url=None,
                    featured=featured,
                )
            )

    logger.info("Loaded %s CSV rows (%s skipped before dedupe)", len(entries), skipped)
    return dedupe_entries(entries)


def fetch_steam_app_type(app_id: int, session: requests.Session) -> str | None:
    response = session.get(
        STEAM_APP_DETAILS_URL,
        params={"appids": app_id, "l": "english"},
        timeout=settings.request_timeout_seconds,
    )
    response.raise_for_status()

    entry = response.json().get(str(app_id), {})
    if not entry.get("success"):
        return None

    app_type = entry.get("data", {}).get("type")
    return app_type if isinstance(app_type, str) else None


def load_steam_entries(limit: int) -> list[GameCatalogEntryPayload]:
    ranks = fetch_steam_charts_ranks(limit=limit)
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "StatusTimer-Seed/1.0 (+catalog-seed; public APIs only)",
            "Accept": "application/json",
        }
    )

    entries: list[GameCatalogEntryPayload] = []
    skipped = 0

    try:
        for index, rank in enumerate(ranks):
            try:
                app_type = fetch_steam_app_type(rank.app_id, session)
                if app_type is not None and app_type != "game":
                    logger.info("Skipping non-game Steam app %s (type=%s)", rank.app_id, app_type)
                    skipped += 1
                    continue

                game_name = fetch_steam_app_name(rank.app_id, session)
                if game_name is None or looks_like_non_game(game_name):
                    skipped += 1
                    continue

                slug = to_slug(game_name)
                if not is_valid_slug(slug):
                    skipped += 1
                    continue

                entries.append(
                    build_catalog_entry(
                        app_id=rank.app_id,
                        game_name=game_name,
                        featured=index < 6,
                    )
                )
            except requests.RequestException as error:
                logger.warning("Steam lookup failed for app_id=%s: %s", rank.app_id, error)
                skipped += 1
    finally:
        session.close()

    logger.info("Prepared %s Steam entries (%s skipped)", len(entries), skipped)
    return dedupe_entries(entries)


def sync_in_batches(client: BackendClient, entries: list[GameCatalogEntryPayload]) -> None:
    if not entries:
        logger.warning("No catalog entries to sync.")
        return

    for offset in range(0, len(entries), BATCH_SIZE):
        batch = entries[offset : offset + BATCH_SIZE]
        result = client.sync_game_catalog(SyncGameCatalogRequest(entries=batch))

        if not result.success:
            logger.error(
                "Batch %s-%s failed (HTTP %s): %s",
                offset + 1,
                offset + len(batch),
                result.status_code,
                result.error_message,
            )
            sys.exit(1)

        logger.info(
            "Synced batch %s-%s (HTTP %s)",
            offset + 1,
            offset + len(batch),
            result.status_code,
        )

    logger.info(
        "Catalog seed complete: %s entries pushed in %s batch(es).",
        len(entries),
        (len(entries) + BATCH_SIZE - 1) // BATCH_SIZE,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed tracked games into CATALOG layer.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--csv",
        type=Path,
        help="Path to CSV with slug, game_name, optional steam_app_id and featured columns.",
    )
    source.add_argument(
        "--steam-limit",
        type=int,
        metavar="N",
        help="Fetch top N Steam Charts titles (filters to type=game).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and log entries without calling the backend.",
    )
    return parser.parse_args()


def main() -> None:
    load_dotenv()
    args = parse_args()

    if args.csv is not None:
        entries = load_csv_entries(args.csv)
    else:
        limit = args.steam_limit or 500
        if limit < 1 or limit > 1000:
            raise SystemExit("--steam-limit must be between 1 and 1000")
        entries = load_steam_entries(limit)

    logger.info("Ready to sync %s unique catalog entries", len(entries))

    if args.dry_run:
        for entry in entries[:10]:
            logger.info("  %s | %s | steam=%s", entry.slug, entry.game_name, entry.steam_app_id)
        if len(entries) > 10:
            logger.info("  ... and %s more", len(entries) - 10)
        return

    client = BackendClient()
    sync_in_batches(client, entries)


if __name__ == "__main__":
    main()
