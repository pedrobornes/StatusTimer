import { FETCH_REVALIDATE_NEWS } from "@/config/cache";
import type { MetadataRoute } from "next";
import { APP_ROUTES } from "@/config/routes";
import { hasNumericNewsSlugSuffix } from "@/lib/seo/newsSlugs";
import { isIndexableNewsContent } from "@/lib/seo/newsIndexability";
import { getGamingNews } from "@/services/newsService";
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
  articles: Awaited<ReturnType<typeof getGamingNews>>,
): MetadataRoute.Sitemap {
  return articles
    .filter((article) => isIndexableNewsContent(article.content))
    .filter((article) => !hasNumericNewsSlugSuffix(article.slug))
    .map((article) => ({
      url: `${siteUrl}${APP_ROUTES.newsArticle(article.slug)}`,
      lastModified: new Date(article.publishedAt ?? article.createdAt),
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
    const articles = await getGamingNews({ revalidate: FETCH_REVALIDATE_NEWS });
    return toNewsSitemapEntries(siteUrl, articles);
  } catch {
    return [];
  }
}
