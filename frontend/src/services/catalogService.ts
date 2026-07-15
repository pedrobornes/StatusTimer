import type { ApiRequestOptions } from "@/services/api";
import { fetchJson, postJson } from "@/services/api";
import { dedupeCatalogSearchResults } from "@/lib/gameSlugs";
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

export function getCatalogGenres(
  fetchOptions: ApiRequestOptions = {},
): Promise<string[]> {
  return fetchJson<string[]>("/api/v1/catalog/games/genres", fetchOptions);
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
  releaseDate?: string | null;
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

const SEARCH_CACHE_MAX_ENTRIES = 32;
const searchResultCache = new Map<string, GameCatalogSearchResult[]>();
let activeSearchRequest: AbortController | null = null;

function normalizeSearchCacheKey(query: string): string {
  return query.trim().toLowerCase();
}

function rememberSearchResults(
  cacheKey: string,
  results: GameCatalogSearchResult[],
): GameCatalogSearchResult[] {
  if (searchResultCache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = searchResultCache.keys().next().value;
    if (oldestKey) {
      searchResultCache.delete(oldestKey);
    }
  }

  searchResultCache.set(cacheKey, results);
  return results;
}

export async function searchGames(
  query: string,
): Promise<GameCatalogSearchResult[]> {
  const cacheKey = normalizeSearchCacheKey(query);
  if (!cacheKey) {
    return [];
  }

  const cached = searchResultCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  activeSearchRequest?.abort();
  const controller = new AbortController();
  activeSearchRequest = controller;

  const params = new URLSearchParams({ q: query });

  try {
    const results = await fetchJson<GameCatalogSearchResult[]>(
      `/api/v1/games/search?${params.toString()}`,
      { cache: "no-store", revalidate: 0, signal: controller.signal },
    );

    const deduped = dedupeCatalogSearchResults(results);
    if (activeSearchRequest === controller) {
      activeSearchRequest = null;
    }

    return rememberSearchResults(cacheKey, deduped);
  } catch (error) {
    if (activeSearchRequest === controller) {
      activeSearchRequest = null;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw error;
  }
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
