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

  const genreMap: Record<Exclude<ReleaseGenreFilter, "All">, string> = {
    FPS: "Shooter",
    RPG: "RPG",
    Survival: "Survival",
    Sports: "Sports/Racing",
  };

  const targetGenre = genreMap[genre];
  return releases.filter((release) => release.genre === targetGenre);
}
