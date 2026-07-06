import { fetchJson, postJson } from "@/services/api";

export interface GameCatalogSearchResult {
  slug: string;
  gameName: string;
  logoUrl: string | null;
  coverUrl?: string | null;
  steamAppId: number | null;
  userRating?: number | null;
  criticRating?: number | null;
  genreName?: string | null;
  themes?: string[];
}

export interface GameIndexableSlug {
  slug: string;
  lastModified: string;
  isIndexable: boolean;
}

export interface GameActivationResult {
  slug: string;
  promoted: boolean;
  telemetryReady: boolean;
  jobQueued: boolean;
}

export function searchGames(query: string): Promise<GameCatalogSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  return fetchJson<GameCatalogSearchResult[]>(
    `/api/v1/games/search?${params.toString()}`,
  );
}

export function fetchIndexableSlugs(): Promise<GameIndexableSlug[]> {
  return fetchJson<GameIndexableSlug[]>("/api/v1/games/slugs", {
    revalidate: 3600,
  });
}

export function activateGame(slug: string): Promise<GameActivationResult> {
  return postJson<GameActivationResult>(`/api/v1/games/${slug}/activate`, {
    revalidate: 0,
  });
}
