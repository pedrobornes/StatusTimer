import type { MetadataRoute } from "next";
import { APP_ROUTES } from "@/config/routes";
import { getSiteUrl } from "@/config/site";
import {
  getLastSuccessfulSitemapSlugs,
  rememberSitemapSlugs,
} from "@/lib/seo/sitemapSnapshot";
import {
  fetchIndexableSlugs,
  type GameIndexableSlug,
} from "@/services/catalogService";
import {
  fetchNewsSitemapEntries,
  fetchReleaseSitemapEntries,
} from "@/lib/seo/sitemapBuilders";

const siteUrl = getSiteUrl();

export const revalidate = 3600;

function buildStaticSitemapEntries(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${siteUrl}/status`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}${APP_ROUTES.games}`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}${APP_ROUTES.releases}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${siteUrl}${APP_ROUTES.howItWorks}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}${APP_ROUTES.faq}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${siteUrl}${APP_ROUTES.contact}`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}

function toGameSitemapEntries(slugs: GameIndexableSlug[]): MetadataRoute.Sitemap {
  return slugs
    .filter((entry) => entry.isIndexable)
    .map((entry) => ({
      url: `${siteUrl}${APP_ROUTES.status(entry.slug)}`,
      lastModified: new Date(entry.lastModified),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    }));
}

const staticFallbackUrls = buildStaticSitemapEntries();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [slugs, releaseEntries, newsEntries] = await Promise.all([
      fetchIndexableSlugs(),
      fetchReleaseSitemapEntries(siteUrl),
      fetchNewsSitemapEntries(siteUrl),
    ]);
    rememberSitemapSlugs(slugs);
    return [
      ...staticFallbackUrls,
      ...toGameSitemapEntries(slugs),
      ...releaseEntries,
      ...newsEntries,
    ];
  } catch {
    const cachedSlugs = getLastSuccessfulSitemapSlugs();
    if (cachedSlugs && cachedSlugs.length > 0) {
      return [...staticFallbackUrls, ...toGameSitemapEntries(cachedSlugs)];
    }

    return staticFallbackUrls;
  }
}
