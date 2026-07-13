"""Audit production sitemap for duplicate or non-canonical game slugs."""

from __future__ import annotations

import re
import ssl
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from config.game_slug_registry import normalize_catalog_slug

SITEMAP_URL = "https://www.status-timer.com/sitemap.xml"


def fetch_sitemap() -> str:
    context = ssl.create_default_context()
    request = urllib.request.Request(
        SITEMAP_URL,
        headers={"User-Agent": "StatusTimer-Audit/1.0"},
    )
    with urllib.request.urlopen(request, timeout=60, context=context) as response:
        return response.read().decode("utf-8", errors="replace")


def main() -> int:
    xml = fetch_sitemap()
    slugs = sorted(set(re.findall(r"/status/([a-z0-9-]+)", xml)))
    slug_set = set(slugs)

    print(f"Total /status/ URLs in sitemap: {len(slugs)}\n")

    checks = [
        "apex-legends",
        "apex-legends-tm",
        "apex-legends-1",
        "slay-the-spire-2",
        "slay-the-spire-ii",
        "call-of-duty-black-ops-2",
        "call-of-duty-black-ops-ii",
        "grand-theft-auto-v",
        "grand-theft-auto-5",
        "gta-v",
        "infinity",
        "infinity-r",
        "helldivers-2",
        "helldivers-2-tm",
        "ea-sports-fc-26",
        "ea-sports-fc-tm-26",
        "diablo-4",
        "diablo-iv",
        "civilization-vi",
        "civilization-6",
        "red-dead-redemption-2",
        "red-dead-redemption-ii",
    ]
    print("Known slug presence in sitemap:")
    for slug in checks:
        present = "YES" if slug in slug_set else "no"
        print(f"  {slug}: {present}")

    by_normalized = defaultdict(list)
    for slug in slugs:
        by_normalized[normalize_catalog_slug(slug)].append(slug)

    print("\n=== DUPLICATE GROUPS (same normalized slug) ===")
    duplicate_groups = [
        (canonical, variants)
        for canonical, variants in sorted(by_normalized.items())
        if len(variants) > 1
    ]
    if duplicate_groups:
        for canonical, variants in duplicate_groups:
            print(f"  {canonical}: {variants}")
    else:
        print("  (none)")

    print("\n=== PAIRED DUPLICATES (both variants indexed) ===")
    paired = [
        (slug, normalize_catalog_slug(slug))
        for slug in slugs
        if slug != normalize_catalog_slug(slug) and normalize_catalog_slug(slug) in slug_set
    ]
    if paired:
        for alias, canonical in paired:
            print(f"  {alias} + {canonical}")
    else:
        print("  (none)")

    print("\n=== ORPHAN VARIANTS (only non-canonical slug indexed) ===")
    orphans = [
        (slug, normalize_catalog_slug(slug))
        for slug in slugs
        if slug != normalize_catalog_slug(slug) and normalize_catalog_slug(slug) not in slug_set
    ]
    if orphans:
        for alias, canonical in orphans:
            print(f"  {alias} -> should be {canonical}")
    else:
        print("  (none)")

    print("\n=== -tm SLUGS IN SITEMAP ===")
    tm_slugs = [slug for slug in slugs if "-tm" in slug]
    if tm_slugs:
        for slug in tm_slugs:
            print(f"  {slug} -> {normalize_catalog_slug(slug)}")
    else:
        print("  (none)")

    print("\n=== ROMAN-NUMERAL SUFFIX SLUGS IN SITEMAP ===")
    roman_suffixes = ("-i", "-ii", "-iii", "-iv", "-v", "-vi", "-vii", "-viii", "-ix", "-x")
    roman_slugs = [slug for slug in slugs if any(slug.endswith(suffix) for suffix in roman_suffixes)]
    for slug in roman_slugs:
        canonical = normalize_catalog_slug(slug)
        sibling = "paired" if canonical in slug_set and canonical != slug else "orphan"
        print(f"  {slug} -> {canonical} [{sibling}]")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
