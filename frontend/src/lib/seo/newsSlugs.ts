import type { GamingNews } from "@/types/api";

const NUMERIC_NEWS_SLUG_SUFFIX = /-(\d+)$/;

export function hasNumericNewsSlugSuffix(slug: string): boolean {
  return NUMERIC_NEWS_SLUG_SUFFIX.test(slug);
}

export function stripNumericNewsSlugSuffix(slug: string): string | null {
  const match = slug.match(/^(.*)-(\d+)$/);
  return match?.[1] ?? null;
}

/** Mirrors backend GamingNewsService.normalizeNewsTitle for dedup comparisons. */
export function normalizeNewsTitleForDedup(title: string): string {
  if (!title.trim()) {
    return "";
  }

  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[!?.:;]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveNewsGroupingKey(gameTag: string): string {
  const normalized = gameTag.trim().toLowerCase();
  return normalized || "unknown";
}

export function buildNewsDedupKey(gameTag: string, title: string): string {
  return `${resolveNewsGroupingKey(gameTag)}|${normalizeNewsTitleForDedup(title)}`;
}

/**
 * Backend findBySlug resolves aliases / retired -N suffixes to the canonical article
 * and always returns article.slug as the primary news_slug.
 */
export function resolveCanonicalNewsArticleSlug(
  requestedSlug: string,
  article: GamingNews,
): string {
  const canonical = article.slug?.trim();
  return canonical && canonical.length > 0 ? canonical : requestedSlug;
}
