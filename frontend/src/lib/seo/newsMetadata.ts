import type { Metadata } from "next";
import {
  buildNewsExcerpt,
  cleanNewsDisplayTitle,
  resolveNewsGameName,
} from "@/lib/intelFeed";
import {
  buildNoindexFollowRobots,
  buildRobotsDirective,
} from "@/lib/seo/indexability";
import { isIndexableNewsContent } from "@/lib/seo/newsIndexability";
import type { GamingNews } from "@/types/api";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export function buildNewsArticleMetadata(article: GamingNews): Metadata {
  const gameName = resolveNewsGameName(article);
  const displayTitle = cleanNewsDisplayTitle(article.title, article.gameTag);
  const canonicalPath = `/news/${article.slug}`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const indexable = isIndexableNewsContent(article.content);
  const description =
    buildNewsExcerpt(article.content, 160) ||
    `${gameName} patch notes, game updates, and official developer news on StatusTimer.`;

  return {
    title: `${displayTitle} | ${gameName} News`,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: buildRobotsDirective(indexable),
    openGraph: {
      title: `${displayTitle} | ${gameName}`,
      description,
      url: canonicalUrl,
      siteName: "StatusTimer",
      locale: "en_US",
      type: "article",
      publishedTime: article.publishedAt ?? article.createdAt,
      modifiedTime: article.createdAt,
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayTitle} | ${gameName}`,
      description,
    },
  };
}

interface NewsIndexMetadataInput {
  gameName: string;
  indexPath: string;
  description: string;
}

/** Hub/list pages: noindex so crawl budget stays on status + article URLs. */
export function buildNewsIndexMetadata({
  gameName,
  indexPath,
  description,
}: NewsIndexMetadataInput): Metadata {
  const canonicalUrl = `${siteUrl}${indexPath}`;

  return {
    title: `${gameName} News & Patch Notes`,
    description,
    alternates: {
      canonical: indexPath,
    },
    robots: buildNoindexFollowRobots(),
    openGraph: {
      title: `${gameName} News & Patch Notes | StatusTimer`,
      description,
      url: canonicalUrl,
      siteName: "StatusTimer",
      locale: "en_US",
      type: "website",
    },
  };
}
