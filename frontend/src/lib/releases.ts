import type { GamePlatform, PlatformDetail, UpcomingRelease } from "@/types/api";
import {
  resolveGameBoxArtUrl,
  resolveGameCoverUrl,
} from "@/lib/gameAssets";
import { resolveReleaseGenres } from "@/lib/genres";

export function resolveReleaseHeroUrl(
  slug: string,
  release: Pick<UpcomingRelease, "logoUrl" | "imageUrl">,
): string | null {
  return resolveGameCoverUrl(slug, {
    logoUrl: release.logoUrl ?? undefined,
    coverUrl: release.imageUrl ?? undefined,
  });
}

export function resolveReleaseBoxArtUrl(
  slug: string,
  release: Pick<UpcomingRelease, "logoUrl" | "imageUrl">,
): string | null {
  return resolveGameBoxArtUrl(slug, {
    coverUrl: release.imageUrl ?? undefined,
    logoUrl: release.logoUrl ?? undefined,
  });
}

export const ALL_GENRES_FILTER = "All" as const;

export type ReleaseGenreFilter = typeof ALL_GENRES_FILTER | (string & {});

export function collectReleaseGenres(releases: UpcomingRelease[]): string[] {
  const genres = new Set<string>();
  for (const release of releases) {
    for (const genre of resolveReleaseGenres(release)) {
      genres.add(genre);
    }
  }
  return [...genres].sort((left, right) => left.localeCompare(right));
}

export const RELEASE_SORT_MODES = ["date", "hype", "rating"] as const;

export type ReleaseSortMode = (typeof RELEASE_SORT_MODES)[number];

function isTbaUpcomingRelease(release: UpcomingRelease): boolean {
  return (
    release.platforms.length > 0 ||
    release.hypeCount > 0
  );
}

export function getPrimaryReleaseTimestamp(release: UpcomingRelease): number {
  const platformDates = release.platforms
    .map((platform) => platform.releaseDate)
    .filter((date): date is string => date !== null)
    .map((date) => new Date(date).getTime())
    .filter((timestamp) => !Number.isNaN(timestamp));

  if (platformDates.length > 0) {
    return Math.min(...platformDates);
  }

  if (release.releaseDate) {
    const fallback = new Date(release.releaseDate).getTime();
    if (!Number.isNaN(fallback)) {
      return fallback;
    }
  }

  return isTbaUpcomingRelease(release)
    ? Number.MAX_SAFE_INTEGER
    : Number.NEGATIVE_INFINITY;
}

export function sortReleasesByDate(
  releases: UpcomingRelease[],
): UpcomingRelease[] {
  return [...releases].sort(
    (left, right) =>
      getPrimaryReleaseTimestamp(left) - getPrimaryReleaseTimestamp(right),
  );
}

export function sortReleasesByHype(
  releases: UpcomingRelease[],
): UpcomingRelease[] {
  return [...releases].sort((left, right) => right.hypeCount - left.hypeCount);
}

export function sortReleasesByRating(
  releases: UpcomingRelease[],
): UpcomingRelease[] {
  return [...releases].sort((left, right) => {
    const leftScore = Math.max(left.criticRating ?? 0, left.userRating ?? 0);
    const rightScore = Math.max(right.criticRating ?? 0, right.userRating ?? 0);
    return rightScore - leftScore;
  });
}

export function sortReleases(
  releases: UpcomingRelease[],
  mode: ReleaseSortMode,
): UpcomingRelease[] {
  if (mode === "hype") {
    return sortReleasesByHype(releases);
  }

  if (mode === "rating") {
    return sortReleasesByRating(releases);
  }

  return sortReleasesByDate(releases);
}

/**
 * Keeps only games that have not launched yet. TBA titles from the release feed
 * remain visible when they still carry platform targets or hype.
 */
export function filterUpcomingReleases(
  releases: UpcomingRelease[],
  now: number = Date.now(),
): UpcomingRelease[] {
  return releases.filter((release) => {
    const timestamp = getPrimaryReleaseTimestamp(release);
    if (!Number.isFinite(timestamp)) {
      return false;
    }

    if (timestamp > now) {
      return true;
    }

    return timestamp === Number.MAX_SAFE_INTEGER;
  });
}

export function filterReleasesByGenre(
  releases: UpcomingRelease[],
  genre: ReleaseGenreFilter,
): UpcomingRelease[] {
  if (genre === ALL_GENRES_FILTER) {
    return releases;
  }

  return releases.filter((release) =>
    resolveReleaseGenres(release).includes(genre),
  );
}

export function filterReleasesByMinRating(
  releases: UpcomingRelease[],
  minRating: number | null,
): UpcomingRelease[] {
  if (minRating == null || minRating <= 0) {
    return releases;
  }

  return releases.filter((release) => {
    const best = Math.max(release.criticRating ?? 0, release.userRating ?? 0);
    return best >= minRating;
  });
}

export function buildPlatformsBySlug(
  releases: UpcomingRelease[],
): Record<string, PlatformDetail[]> {
  return Object.fromEntries(
    releases.map((release) => [
      release.slug,
      getConfirmedPlatforms(release.platforms),
    ]),
  );
}

export function getConfirmedPlatforms(
  platforms: PlatformDetail[],
): PlatformDetail[] {
  return platforms.filter(
    (entry): entry is PlatformDetail & { releaseDate: string } =>
      entry.releaseDate !== null,
  );
}

const PLATFORM_DISPLAY_ORDER: readonly GamePlatform[] = [
  "PC",
  "PS5",
  "XBOX",
  "SWITCH",
  "SWITCH_2",
];

export interface PlatformReleaseGroup {
  releaseDate: string | null;
  platforms: GamePlatform[];
}

/** Groups platform launch windows that share the same date (or TBA). */
export function groupPlatformsByReleaseDate(
  platforms: PlatformDetail[],
): PlatformReleaseGroup[] {
  const grouped = new Map<string, PlatformReleaseGroup>();

  for (const entry of platforms) {
    const key = entry.releaseDate ?? "__tba__";
    const existing = grouped.get(key);

    if (existing) {
      existing.platforms.push(entry.platform);
      continue;
    }

    grouped.set(key, {
      releaseDate: entry.releaseDate,
      platforms: [entry.platform],
    });
  }

  return [...grouped.values()]
    .map((group) => ({
      ...group,
      platforms: sortPlatformsForDisplay(group.platforms),
    }))
    .sort(comparePlatformReleaseGroups);
}

function sortPlatformsForDisplay(platforms: GamePlatform[]): GamePlatform[] {
  return [...platforms].sort(
    (left, right) =>
      PLATFORM_DISPLAY_ORDER.indexOf(left) -
      PLATFORM_DISPLAY_ORDER.indexOf(right),
  );
}

function comparePlatformReleaseGroups(
  left: PlatformReleaseGroup,
  right: PlatformReleaseGroup,
): number {
  if (left.releaseDate === null) {
    return 1;
  }

  if (right.releaseDate === null) {
    return -1;
  }

  return (
    new Date(left.releaseDate).getTime() - new Date(right.releaseDate).getTime()
  );
}
