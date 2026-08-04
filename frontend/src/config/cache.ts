/**
 * ISR / fetch revalidate seconds — tuned for Railway Hobby + Vercel ISR write limits.
 *
 * App routes must use numeric literals in `export const revalidate = …`
 * (Next.js cannot statically analyze imported segment config).
 *
 * - 3600 s (1 h): status, home, games — live UP/DOWN refreshes on the client.
 * - 1800 s (30 min): news articles and sitemap news feed (SEO discovery).
 * - 86400 s: upcoming releases hub and release profiles.
 */
export const PAGE_REVALIDATE_SECONDS = 3600;

/** News/article routes — fresher so Google discovers updates sooner. */
export const PAGE_REVALIDATE_NEWS_SECONDS = 1800;

/** Upcoming releases — dates and hype change slowly; 24 h cache is enough. */
export const PAGE_REVALIDATE_RELEASES_SECONDS = 86400;

/** Default for server-side API reads (lists, dashboard blocks, status shells). */
export const FETCH_REVALIDATE_DEFAULT = 3600;

/** News list/detail/sitemap fetches on server components. */
export const FETCH_REVALIDATE_NEWS = 1800;

/** `/api/v1/releases` and per-slug release reads. */
export const FETCH_REVALIDATE_RELEASES = 86400;
