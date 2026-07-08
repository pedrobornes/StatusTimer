import { fetchJson } from "@/services/api";
import type { GamingNews } from "@/types/api";

export function getGamingNews(): Promise<GamingNews[]> {
  return fetchJson<GamingNews[]>("/api/v1/news");
}

export function getGamingNewsById(id: number): Promise<GamingNews> {
  return fetchJson<GamingNews>(`/api/v1/news/${id}`);
}

export function getGamingNewsBySlug(slug: string): Promise<GamingNews> {
  return fetchJson<GamingNews>(`/api/v1/news/slug/${slug}`);
}

export function getGamingNewsByGame(
  gameSlug: string,
  limit = 24,
): Promise<GamingNews[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return fetchJson<GamingNews[]>(
    `/api/v1/news/game/${gameSlug}?${params.toString()}`,
  );
}
