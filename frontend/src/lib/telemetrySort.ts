import type { GameTelemetry } from "@/types/telemetry";

export type TelemetrySortMode = "trending" | "new-releases";

const NEW_RELEASE_WINDOW_DAYS = 180;

function compareDefaultOrder(
  slugA: string,
  slugB: string,
  defaultOrder: readonly string[],
): number {
  const indexA = defaultOrder.indexOf(slugA);
  const indexB = defaultOrder.indexOf(slugB);
  const rankA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
  const rankB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
  return rankA - rankB;
}

function compareTwitchRank(
  rankA: number | null | undefined,
  rankB: number | null | undefined,
): number {
  const hasA = rankA != null;
  const hasB = rankB != null;

  if (hasA && hasB) {
    return rankA - rankB;
  }

  if (hasA) {
    return -1;
  }

  if (hasB) {
    return 1;
  }

  return 0;
}

function parseIsoDate(value: string | null | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isRecentSteamRelease(entry: GameTelemetry): boolean {
  if (entry.steamAdultContent || entry.isUpcoming) {
    return false;
  }

  const releaseTimestamp = parseIsoDate(entry.steamReleaseDate ?? null);
  if (releaseTimestamp === null) {
    return false;
  }

  const cutoff = Date.now() - NEW_RELEASE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return releaseTimestamp >= cutoff;
}

function compareNewReleases(
  entryA: GameTelemetry | undefined,
  entryB: GameTelemetry | undefined,
): number {
  if (!entryA && !entryB) {
    return 0;
  }

  if (!entryA) {
    return 1;
  }

  if (!entryB) {
    return -1;
  }

  const recentA = isRecentSteamRelease(entryA);
  const recentB = isRecentSteamRelease(entryB);

  if (recentA !== recentB) {
    return recentA ? -1 : 1;
  }

  if (!recentA) {
    return 0;
  }

  const dateA = parseIsoDate(entryA.steamReleaseDate ?? null) ?? 0;
  const dateB = parseIsoDate(entryB.steamReleaseDate ?? null) ?? 0;
  return dateB - dateA;
}

export function sortTelemetrySlugs(
  slugs: readonly string[],
  telemetryBySlug: Record<string, GameTelemetry>,
  mode: TelemetrySortMode,
  defaultOrder: readonly string[] = slugs,
): string[] {
  const ordered = [...slugs];

  if (mode === "new-releases") {
    return ordered.sort((slugA, slugB) => {
      const byRelease = compareNewReleases(
        telemetryBySlug[slugA],
        telemetryBySlug[slugB],
      );

      if (byRelease !== 0) {
        return byRelease;
      }

      return compareDefaultOrder(slugA, slugB, defaultOrder);
    });
  }

  return ordered.sort((slugA, slugB) => {
    const byTwitch = compareTwitchRank(
      telemetryBySlug[slugA]?.twitchRank,
      telemetryBySlug[slugB]?.twitchRank,
    );

    if (byTwitch !== 0) {
      return byTwitch;
    }

    return compareDefaultOrder(slugA, slugB, defaultOrder);
  });
}

export function sortTelemetryEntries(
  entries: GameTelemetry[],
  mode: TelemetrySortMode,
  defaultOrder: readonly string[],
): GameTelemetry[] {
  const ordered = [...entries];

  if (mode === "new-releases") {
    return ordered.sort((entryA, entryB) => {
      const byRelease = compareNewReleases(entryA, entryB);

      if (byRelease !== 0) {
        return byRelease;
      }

      return compareDefaultOrder(entryA.gameSlug, entryB.gameSlug, defaultOrder);
    });
  }

  return ordered.sort((entryA, entryB) => {
    const byTwitch = compareTwitchRank(entryA.twitchRank, entryB.twitchRank);

    if (byTwitch !== 0) {
      return byTwitch;
    }

    return compareDefaultOrder(entryA.gameSlug, entryB.gameSlug, defaultOrder);
  });
}
