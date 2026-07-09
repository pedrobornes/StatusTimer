import type { ApiRequestOptions } from "@/services/api";
import { fetchJson } from "@/services/api";
import type { GamingNews } from "@/types/api";

const LIVE_NEWS_FETCH_OPTIONS: ApiRequestOptions = {
  cache: "no-store",
  revalidate: 0,
};

export function getGamingNews(
  options: ApiRequestOptions = {},
): Promise<GamingNews[]> {
  return fetchJson<GamingNews[]>("/api/v1/news", {
    ...LIVE_NEWS_FETCH_OPTIONS,
    ...options,
  });
}

export function getGamingNewsById(
  id: number,
  options: ApiRequestOptions = {},
): Promise<GamingNews> {
  return fetchJson<GamingNews>(`/api/v1/news/${id}`, {
    ...LIVE_NEWS_FETCH_OPTIONS,
    ...options,
  });
}

export function getGamingNewsBySlug(
  slug: string,
  options: ApiRequestOptions = {},
): Promise<GamingNews> {
  return fetchJson<GamingNews>(
    `/api/v1/news/slug/${encodeURIComponent(slug)}`,
    {
      ...LIVE_NEWS_FETCH_OPTIONS,
      ...options,
    },
  );
}

export function getGamingNewsByGame(
  gameSlug: string,
  limit = 24,
  options: ApiRequestOptions = {},
): Promise<GamingNews[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return fetchJson<GamingNews[]>(
    `/api/v1/news/game/${encodeURIComponent(gameSlug)}?${params.toString()}`,
    {
      ...LIVE_NEWS_FETCH_OPTIONS,
      ...options,
    },
  );
}
