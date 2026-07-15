import type { GameTelemetry } from "@/types/telemetry";

export type TelemetrySortMode = "trending" | "top-rated";

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

function compareTwitchViewers(
  viewersA: number | null | undefined,
  viewersB: number | null | undefined,
): number {
  const hasA = viewersA != null;
  const hasB = viewersB != null;

  if (hasA && hasB) {
    return viewersB - viewersA;
  }

  if (hasA) {
    return -1;
  }

  if (hasB) {
    return 1;
  }

  return 0;
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

function resolveSteamPopularityScore(entry: GameTelemetry | undefined): number {
  if (!entry) {
    return -1;
  }

  const reviewCount = entry.steamReviewCount ?? 0;
  const reviewScore = entry.steamReviewScorePercent ?? 0;
  if (reviewCount > 0 && reviewScore > 0) {
    return reviewScore * Math.log10(reviewCount + 1);
  }

  const user = entry.userRating ?? -1;
  const critic = entry.criticRating ?? -1;
  return Math.max(user, critic);
}

function compareTopRated(
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

  const scoreA = resolveSteamPopularityScore(entryA);
  const scoreB = resolveSteamPopularityScore(entryB);
  if (scoreA !== scoreB) {
    return scoreB - scoreA;
  }

  const reviewCountCompare =
    (entryB.steamReviewCount ?? 0) - (entryA.steamReviewCount ?? 0);
  if (reviewCountCompare !== 0) {
    return reviewCountCompare;
  }

  const rankCompare = compareTwitchRank(entryA.twitchRank, entryB.twitchRank);
  if (rankCompare !== 0) {
    return rankCompare;
  }

  return 0;
}

export function sortTelemetrySlugs(
  slugs: readonly string[],
  telemetryBySlug: Record<string, GameTelemetry>,
  mode: TelemetrySortMode,
  defaultOrder: readonly string[] = slugs,
): string[] {
  const ordered = [...slugs];

  if (mode === "top-rated") {
    return ordered.sort((slugA, slugB) => {
      const byTopRating = compareTopRated(
        telemetryBySlug[slugA],
        telemetryBySlug[slugB],
      );

      if (byTopRating !== 0) {
        return byTopRating;
      }

      return compareDefaultOrder(slugA, slugB, defaultOrder);
    });
  }

  return ordered.sort((slugA, slugB) => {
    const entryA = telemetryBySlug[slugA];
    const entryB = telemetryBySlug[slugB];
    const byViewers = compareTwitchViewers(
      entryA?.twitchViewers,
      entryB?.twitchViewers,
    );

    if (byViewers !== 0) {
      return byViewers;
    }

    const byTwitch = compareTwitchRank(entryA?.twitchRank, entryB?.twitchRank);

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

  if (mode === "top-rated") {
    return ordered.sort((entryA, entryB) => {
      const byTopRating = compareTopRated(entryA, entryB);

      if (byTopRating !== 0) {
        return byTopRating;
      }

      return compareDefaultOrder(entryA.gameSlug, entryB.gameSlug, defaultOrder);
    });
  }

  return ordered.sort((entryA, entryB) => {
    const byViewers = compareTwitchViewers(
      entryA.twitchViewers,
      entryB.twitchViewers,
    );

    if (byViewers !== 0) {
      return byViewers;
    }

    const byTwitch = compareTwitchRank(entryA.twitchRank, entryB.twitchRank);

    if (byTwitch !== 0) {
      return byTwitch;
    }

    return compareDefaultOrder(entryA.gameSlug, entryB.gameSlug, defaultOrder);
  });
}

export { isRecentSteamRelease };
