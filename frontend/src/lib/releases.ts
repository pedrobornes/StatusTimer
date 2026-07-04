import type { UpcomingRelease } from "@/types/api";

export const RELEASE_GENRES = [
  "All",
  "FPS",
  "RPG",
  "Survival",
  "Sports",
] as const;

export type ReleaseGenreFilter = (typeof RELEASE_GENRES)[number];

export function sortReleasesByDate(
  releases: UpcomingRelease[],
): UpcomingRelease[] {
  return [...releases].sort(
    (a, b) =>
      new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
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
