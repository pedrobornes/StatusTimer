import { FETCH_REVALIDATE_DEFAULT, PAGE_REVALIDATE_SECONDS } from "@/config/cache";
import { fetchJson } from "@/services/api";
import type { UpcomingRelease } from "@/types/api";

export function getUpcomingReleases(): Promise<UpcomingRelease[]> {
  return fetchJson<UpcomingRelease[]>("/api/v1/releases", {
    revalidate: FETCH_REVALIDATE_DEFAULT,
  });
}

export function getUpcomingReleaseBySlug(
  slug: string,
): Promise<UpcomingRelease> {
  return fetchJson<UpcomingRelease>(`/api/v1/releases/by-slug/${slug}`, {
    revalidate: PAGE_REVALIDATE_SECONDS,
  });
}
