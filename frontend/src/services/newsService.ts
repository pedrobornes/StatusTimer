import type { ApiRequestOptions } from "@/services/api";
import { FETCH_REVALIDATE_NEWS } from "@/config/cache";
import { fetchJson } from "@/services/api";
import type { GamingNews } from "@/types/api";

export function getGamingNews(
  options: ApiRequestOptions = {},
): Promise<GamingNews[]> {
  return fetchJson<GamingNews[]>("/api/v1/news", {
    revalidate: FETCH_REVALIDATE_NEWS,
    ...options,
  });
}

export function getGamingNewsById(
  id: number,
  options: ApiRequestOptions = {},
): Promise<GamingNews> {
  return fetchJson<GamingNews>(`/api/v1/news/${id}`, {
    revalidate: FETCH_REVALIDATE_NEWS,
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
      revalidate: FETCH_REVALIDATE_NEWS,
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
      revalidate: FETCH_REVALIDATE_NEWS,
      ...options,
    },
  );
}
