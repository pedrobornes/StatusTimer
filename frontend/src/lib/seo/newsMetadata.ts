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

const UPDATE_SIGNAL_PATTERN =
  /\b(?:update|hotfix|hotfixes|patch(?:\s+notes?)?|changelog|v?\d+(?:\.\d+){1,3})\b/i;

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function isPatchNotesArticle(article: GamingNews): boolean {
  const normalized = `${article.title} ${article.content}`.toLowerCase();
  return PATCH_NOTES_HINTS.some((hint) => normalized.includes(hint));
}

function hasUpdateSignal(displayTitle: string): boolean {
  return UPDATE_SIGNAL_PATTERN.test(displayTitle);
}

/** Exported for unit tests and JSON-LD alignment. */
export function buildNewsArticleTitle(
  article: GamingNews,
  gameName: string,
  displayTitle: string,
): string {
  if (hasUpdateSignal(displayTitle)) {
    return `${gameName}: ${displayTitle}`;
  }

  if (isPatchNotesArticle(article)) {
    return `${gameName} Patch Notes: ${displayTitle}`;
  }

  return `${displayTitle} | ${gameName} News`;
}

function formatNewsPublishedDate(raw: string | undefined): string | null {
  if (!raw?.trim()) {
    return null;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return SHORT_DATE_FORMATTER.format(parsed);
}

/** Exported for unit tests and JSON-LD alignment. */
export function buildNewsArticleDescription(
  article: GamingNews,
  gameName: string,
): string {
  const excerpt = buildNewsExcerpt(article.content, 150);
  const dateLabel = formatNewsPublishedDate(
    article.publishedAt ?? article.createdAt,
  );

  if (excerpt) {
    return dateLabel ? `${dateLabel} — ${excerpt}` : excerpt;
  }

  return `${gameName} patch notes, game updates, and official developer news on StatusTimer.`;
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
  const description = buildNewsArticleDescription(article, gameName);

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
