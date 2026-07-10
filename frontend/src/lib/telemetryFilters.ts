import type { GameTelemetry } from "@/types/telemetry";
import { resolveGenres } from "@/lib/genres";

export function collectTelemetryGenres(games: GameTelemetry[]): string[] {
  const genres = new Set<string>();

  for (const game of games) {
    for (const genre of resolveGenres(game)) {
      genres.add(genre);
    }
  }

  return [...genres].sort((left, right) => left.localeCompare(right));
}

export function filterTelemetryByGenre(
  games: GameTelemetry[],
  genre: string | "All",
): GameTelemetry[] {
  if (genre === "All") {
    return games;
  }

  return games.filter((game) => resolveGenres(game).includes(genre));
}

export function filterTelemetryByMinRating(
  games: GameTelemetry[],
  minRating: number | null,
): GameTelemetry[] {
  if (minRating == null || minRating <= 0) {
    return games;
  }

  return games.filter((game) => {
    const best = Math.max(game.criticRating ?? 0, game.userRating ?? 0);
    return best >= minRating;
  });
}
