import { FETCH_REVALIDATE_NEWS } from "@/config/cache";
import type { MetadataRoute } from "next";
import { APP_ROUTES } from "@/config/routes";
import {
  getNewsSitemapEntries,
  type NewsSitemapEntry,
} from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";

export function toReleaseSitemapEntries(
  siteUrl: string,
  releases: Awaited<ReturnType<typeof getUpcomingReleases>>,
): MetadataRoute.Sitemap {
  return releases.map((release) => ({
    url: `${siteUrl}${APP_ROUTES.release(release.slug)}`,
    lastModified: release.releaseDate
      ? new Date(release.releaseDate)
      : new Date(),
    changeFrequency: "daily" as const,
    priority: 0.75,
  }));
}

export function toNewsSitemapEntries(
  siteUrl: string,
  entries: NewsSitemapEntry[],
): MetadataRoute.Sitemap {
  return entries.map((entry) => ({
    url: `${siteUrl}${APP_ROUTES.newsArticle(entry.slug)}`,
    lastModified: new Date(entry.publishedAt),
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));
}

export async function fetchReleaseSitemapEntries(
  siteUrl: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const releases = await getUpcomingReleases();
    return toReleaseSitemapEntries(siteUrl, releases);
  } catch {
    return [];
  }
}

export async function fetchNewsSitemapEntries(
  siteUrl: string,
): Promise<MetadataRoute.Sitemap> {
  try {
    const entries = await getNewsSitemapEntries(1000, {
      revalidate: FETCH_REVALIDATE_NEWS,
    });
    return toNewsSitemapEntries(siteUrl, entries);
  } catch {
    return [];
  }
}
