import type { GameGenre, PlatformDetail, UpcomingRelease } from "@/types/api";

export const OFFICIAL_GAME_GENRES = [
  "Shooter",
  "RPG",
  "Survival",
  "Action",
  "Sports/Racing",
  "Strategy",
] as const satisfies readonly GameGenre[];

export const RELEASE_GENRES = ["All", ...OFFICIAL_GAME_GENRES] as const;

export type ReleaseGenreFilter = (typeof RELEASE_GENRES)[number];

export const RELEASE_SORT_MODES = ["date", "hype", "rating"] as const;

export type ReleaseSortMode = (typeof RELEASE_SORT_MODES)[number];

export function getPrimaryReleaseTimestamp(release: UpcomingRelease): number {
  const platformDates = release.platforms
    .map((platform) => platform.releaseDate)
    .filter((date): date is string => date !== null)
    .map((date) => new Date(date).getTime())
    .filter((timestamp) => !Number.isNaN(timestamp));

  if (platformDates.length > 0) {
    return Math.min(...platformDates);
  }

  const fallback = new Date(release.releaseDate).getTime();
  return Number.isNaN(fallback) ? Number.MAX_SAFE_INTEGER : fallback;
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

export function filterReleasesByGenre(
  releases: UpcomingRelease[],
  genre: ReleaseGenreFilter,
): UpcomingRelease[] {
  if (genre === "All") {
    return releases;
  }

  return releases.filter((release) => release.genre === genre);
}

export function filterReleasesByTheme(
  releases: UpcomingRelease[],
  theme: string | "All",
): UpcomingRelease[] {
  if (theme === "All") {
    return releases;
  }

  return releases.filter((release) => release.themes?.includes(theme));
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

export function collectReleaseThemes(releases: UpcomingRelease[]): string[] {
  const themes = new Set<string>();

  for (const release of releases) {
    for (const theme of release.themes ?? []) {
      themes.add(theme);
    }
  }

  return [...themes].sort((left, right) => left.localeCompare(right));
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
