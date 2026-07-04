import { fetchJson } from "@/services/apiClient";
import type { GamingNews } from "@/types/api";

export function getGamingNews(): Promise<GamingNews[]> {
  return fetchJson<GamingNews[]>("/api/v1/news");
}
