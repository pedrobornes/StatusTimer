import { fetchJson } from "@/services/apiClient";
import type { ServerStatus } from "@/types/api";

export function getServerStatuses(): Promise<ServerStatus[]> {
  return fetchJson<ServerStatus[]>("/api/v1/status");
}
