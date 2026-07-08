interface GenreSource {
  genre?: string | null;
  genreName?: string | null;
  genreNames?: string[] | null;
}

export function resolveGenres(source: GenreSource | null | undefined): string[] {
  if (!source) {
    return [];
  }

  const fromList = source.genreNames?.filter((genre) => genre.trim().length > 0) ?? [];

  if (fromList.length > 0) {
    return [...new Set(fromList.map((genre) => genre.trim()))];
  }

  const single = source.genre?.trim() || source.genreName?.trim();
  return single ? [single] : [];
}

export function resolveReleaseGenres(source: GenreSource): string[] {
  return resolveGenres(source);
}
