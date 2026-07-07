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
