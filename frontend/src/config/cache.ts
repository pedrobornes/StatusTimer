/**
 * ISR / fetch revalidate seconds — tuned for Railway Hobby cost control.
 * Harvester cycle is ~15 min; 10 min page cache keeps data fresh enough.
 */
export const PAGE_REVALIDATE_HOME = 600;
export const PAGE_REVALIDATE_GAMES = 600;
export const PAGE_REVALIDATE_RELEASES = 600;
export const PAGE_REVALIDATE_STATUS = 600;
export const PAGE_REVALIDATE_NEWS = 600;

/** Default for server-side API reads (lists, dashboard blocks). */
export const FETCH_REVALIDATE_DEFAULT = 600;
