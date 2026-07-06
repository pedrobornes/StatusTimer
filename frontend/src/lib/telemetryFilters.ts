import type { GameTelemetry } from "@/types/telemetry";

export function collectTelemetryGenres(games: GameTelemetry[]): string[] {
  const genres = new Set<string>();

  for (const game of games) {
    if (game.genreName?.trim()) {
      genres.add(game.genreName.trim());
    }
  }

  return [...genres].sort((left, right) => left.localeCompare(right));
}

export function collectTelemetryThemes(games: GameTelemetry[]): string[] {
  const themes = new Set<string>();

  for (const game of games) {
    for (const theme of game.themes ?? []) {
      if (theme.trim()) {
        themes.add(theme.trim());
      }
    }
  }

  return [...themes].sort((left, right) => left.localeCompare(right));
}

export function filterTelemetryByGenre(
  games: GameTelemetry[],
  genre: string | "All",
): GameTelemetry[] {
  if (genre === "All") {
    return games;
  }

  return games.filter((game) => game.genreName === genre);
}

export function filterTelemetryByTheme(
  games: GameTelemetry[],
  theme: string | "All",
): GameTelemetry[] {
  if (theme === "All") {
    return games;
  }

  return games.filter((game) => game.themes?.includes(theme));
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
