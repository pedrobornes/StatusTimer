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
import { getSiteUrl } from "@/config/site";

const siteUrl = getSiteUrl();

const PATCH_NOTES_HINTS = [
  "patch notes",
  "patch note",
  "hotfix",
  "changelog",
  "game update",
  "maintenance break",
  "server maintenance",
] as const;

function isPatchNotesArticle(article: GamingNews): boolean {
  const normalized = `${article.title} ${article.content}`.toLowerCase();
  return PATCH_NOTES_HINTS.some((hint) => normalized.includes(hint));
}

function buildNewsArticleTitle(
  article: GamingNews,
  gameName: string,
  displayTitle: string,
): string {
  if (isPatchNotesArticle(article)) {
    return `${gameName} Patch Notes: ${displayTitle}`;
  }

  return `${displayTitle} | ${gameName} News`;
}

export function buildNewsArticleMetadata(
  article: GamingNews,
  canonicalSlug = article.slug,
): Metadata {
  const gameName = resolveNewsGameName(article);
  const displayTitle = cleanNewsDisplayTitle(article.title, article.gameTag);
  const canonicalPath = `/news/${canonicalSlug}`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const indexable = isIndexableNewsContent(article.content);
  const pageTitle = buildNewsArticleTitle(article, gameName, displayTitle);
  const description =
    buildNewsExcerpt(article.content, 160) ||
    `${gameName} patch notes, game updates, and official developer news on StatusTimer.`;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: buildRobotsDirective(indexable),
    openGraph: {
      title: pageTitle,
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
      title: pageTitle,
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
