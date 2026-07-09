import type { GamingNews } from "@/types/api";

export const GAME_NEWS_PREVIEW_LIMIT = 5;
export const GAME_NEWS_PAGE_SIZE = 5;

export function resolveNewsTimestamp(article: GamingNews): number {
  const raw = article.publishedAt ?? article.createdAt;
  if (!raw) {
    return 0;
  }

  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortNewsByRecency(articles: GamingNews[]): GamingNews[] {
  return [...articles].sort(
    (left, right) => resolveNewsTimestamp(right) - resolveNewsTimestamp(left),
  );
}

export function paginateNews(
  articles: GamingNews[],
  page: number,
  pageSize: number = GAME_NEWS_PAGE_SIZE,
): {
  items: GamingNews[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
} {
  const sorted = sortNewsByRecency(articles);
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    items: sorted.slice(start, start + pageSize),
    totalPages,
    currentPage,
    totalItems,
  };
}
