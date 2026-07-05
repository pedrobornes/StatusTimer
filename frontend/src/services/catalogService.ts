import { fetchJson } from "@/services/api";

export interface GameCatalogSearchResult {
  slug: string;
  gameName: string;
  logoUrl: string | null;
  steamAppId: number | null;
}

export function searchGames(query: string): Promise<GameCatalogSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  return fetchJson<GameCatalogSearchResult[]>(
    `/api/v1/games/search?${params.toString()}`,
  );
}
