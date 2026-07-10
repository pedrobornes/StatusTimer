import type { ApiRequestOptions } from "@/services/api";
import { fetchJson, postJson } from "@/services/api";
import type { GameTelemetry } from "@/types/telemetry";

export interface GameCatalogPage {
  items: GameTelemetry[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CatalogGamesOptions {
  page?: number;
  size?: number;
  genre?: string;
  q?: string;
}

export function getCatalogGames(
  options: CatalogGamesOptions & ApiRequestOptions = {},
): Promise<GameCatalogPage> {
  const { page = 0, size = 100, genre, q, ...fetchOptions } = options;
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  if (genre && genre !== "All") {
    params.set("genre", genre);
  }

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  return fetchJson<GameCatalogPage>(
    `/api/v1/catalog/games?${params.toString()}`,
    fetchOptions,
  );
}

export interface GameCatalogSearchResult {
  id: number;
  slug: string;
  gameName: string;
  logoUrl: string | null;
  coverUrl?: string | null;
  steamAppId: number | null;
  userRating?: number | null;
  criticRating?: number | null;
  genreName?: string | null;
  genreNames?: string[];
  livePlayers?: number | null;
  twitchViewers?: number | null;
  upcomingRelease?: boolean;
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
    { cache: "no-store", revalidate: 0 },
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
