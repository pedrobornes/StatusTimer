/**
 * ISR / fetch revalidate seconds — tuned for Railway Hobby cost control.
 *
 * App routes must use numeric literals in `export const revalidate = …`
 * (Next.js cannot statically analyze imported segment config).
 *
 * - 600 s: status, home, games (online/down may lag up to ~10 min).
 * - 3600 s: news subpages.
 * - 86400 s: upcoming releases hub and release profiles.
 */
export const PAGE_REVALIDATE_SECONDS = 600;

/** News/article routes — lower egress priority than live status. */
export const PAGE_REVALIDATE_NEWS_SECONDS = 3600;

/** Upcoming releases — dates and hype change slowly; 24 h cache is enough. */
export const PAGE_REVALIDATE_RELEASES_SECONDS = 86400;

/** Default for server-side API reads (lists, dashboard blocks). */
export const FETCH_REVALIDATE_DEFAULT = 600;

/** News list/detail fetches on server components. */
export const FETCH_REVALIDATE_NEWS = 3600;

/** `/api/v1/releases` and per-slug release reads. */
export const FETCH_REVALIDATE_RELEASES = 86400;
