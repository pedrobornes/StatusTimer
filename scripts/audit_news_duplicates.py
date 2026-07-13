"""Audit duplicate gaming news for a game slug via the public API or HTML page."""

from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.request
from collections import Counter, defaultdict

SITE_BASE = "https://www.status-timer.com"


def fetch_game_news_api(game_slug: str, limit: int = 100) -> list[dict]:
    context = ssl.create_default_context()
    url = f"{SITE_BASE}/api/v1/news/game/{game_slug}?limit={limit}"
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "StatusTimer-Audit/1.0", "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30, context=context) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, list):
        raise TypeError(f"Expected list from {url}, got {type(payload).__name__}")
    return payload


def fetch_game_news_html(game_slug: str) -> list[str]:
    context = ssl.create_default_context()
    url = f"{SITE_BASE}/status/{game_slug}/news"
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "StatusTimer-Audit/1.0", "Accept": "text/html"},
    )
    with urllib.request.urlopen(request, timeout=60, context=context) as response:
        html = response.read().decode("utf-8", errors="replace")

    titles = re.findall(r"<h2[^>]*>(.*?)</h2>", html, re.S)
    return [re.sub(r"<[^<]+?>", "", title).strip() for title in titles]


def audit(game_slug: str) -> int:
    print(f"Game: {game_slug}")

    try:
        items = fetch_game_news_api(game_slug)
        print("Source: API")
        print(f"Total items: {len(items)}")
        print(f"Unique ids: {len({item.get('id') for item in items})}")
        print(f"Unique slugs: {len({item.get('slug') for item in items})}")

        titles = [str(item.get("title", "")).strip() for item in items]
        print(f"Unique titles: {len(set(titles))}")

        by_title: dict[str, list[dict]] = defaultdict(list)
        for item in items:
            by_title[str(item.get("title", "")).strip()].append(item)

        duplicates = [(title, rows) for title, rows in by_title.items() if len(rows) > 1]
        duplicates.sort(key=lambda pair: len(pair[1]), reverse=True)

        print(f"Duplicate title groups: {len(duplicates)}")
        for title, rows in duplicates[:15]:
            print(f"\n  x{len(rows)}: {title}")
            for row in rows:
                print(
                    "    "
                    f"id={row.get('id')} "
                    f"slug={row.get('slug')} "
                    f"gameTag={row.get('gameTag')} "
                    f"publishedAt={row.get('publishedAt')} "
                    f"createdAt={row.get('createdAt')}"
                )

        tag_counts = Counter(str(item.get("gameTag", "")) for item in items)
        if len(tag_counts) > 1:
            print("\nMixed gameTag values:")
            for tag, count in tag_counts.most_common():
                print(f"  {tag or '(empty)'}: {count}")
    except Exception as error:
        print(f"API audit failed: {error}")

    titles = fetch_game_news_html(game_slug)
    print("\nSource: rendered HTML")
    print(f"Visible article titles: {len(titles)}")
    print(f"Unique visible titles: {len(set(titles))}")
    for title, count in Counter(titles).most_common(10):
        if count > 1:
            print(f"  x{count}: {title}")

    return 0


if __name__ == "__main__":
    slug = sys.argv[1] if len(sys.argv) > 1 else "palworld"
    raise SystemExit(audit(slug))
