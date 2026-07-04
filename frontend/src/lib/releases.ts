import type { GameGenre, UpcomingRelease } from "@/types/api";

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

export function filterReleasesByGenre(
  releases: UpcomingRelease[],
  genre: ReleaseGenreFilter,
): UpcomingRelease[] {
  if (genre === "All") {
    return releases;
  }

  return releases.filter((release) => release.genre === genre);
}
