import { fetchJson } from "@/services/api";
import type { UpcomingRelease } from "@/types/api";

export function getUpcomingReleases(): Promise<UpcomingRelease[]> {
  return fetchJson<UpcomingRelease[]>("/api/v1/releases");
}
