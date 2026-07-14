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

export async function resolveCanonicalNewsArticleSlug(
  requestedSlug: string,
  article: GamingNews,
  fetchBySlug: (slug: string) => Promise<GamingNews>,
): Promise<string> {
  const baseSlug = stripNumericNewsSlugSuffix(requestedSlug);
  if (!baseSlug) {
    return requestedSlug;
  }

  try {
    const baseArticle = await fetchBySlug(baseSlug);
    const requestedKey = buildNewsDedupKey(article.gameTag, article.title);
    const baseKey = buildNewsDedupKey(baseArticle.gameTag, baseArticle.title);

    if (requestedKey === baseKey) {
      return baseSlug;
    }
  } catch {
    return requestedSlug;
  }

  return requestedSlug;
}
