/**
 * ISR / fetch revalidate seconds — tuned for fresher status/news data.
 *
 * App routes must use numeric literals in `export const revalidate = …`
 * (Next.js cannot statically analyze imported segment config).
 *
 * - 180 s: home, games, status shells (live UP/DOWN still hydrates on the client).
 * - 120 s: news articles and sitemap news feed.
 * - 600 s: upcoming releases hub and release profiles.
 */
export const PAGE_REVALIDATE_SECONDS = 180;

/** News/article routes — fresher so Google discovers updates sooner. */
export const PAGE_REVALIDATE_NEWS_SECONDS = 120;

/** Upcoming releases — dates and hype change slowly. */
export const PAGE_REVALIDATE_RELEASES_SECONDS = 600;

/** Default for server-side API reads (lists, dashboard blocks, status shells). */
export const FETCH_REVALIDATE_DEFAULT = 120;

/** News list/detail/sitemap fetches on server components. */
export const FETCH_REVALIDATE_NEWS = 120;

/** `/api/v1/releases` and per-slug release reads. */
export const FETCH_REVALIDATE_RELEASES = 600;
