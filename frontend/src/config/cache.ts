/**
 * ISR / fetch revalidate seconds — tuned for Railway Hobby cost control.
 * Harvester cycle is ~10 min; 3 min page cache keeps data fresh enough.
 */
export const PAGE_REVALIDATE_HOME = 180;
export const PAGE_REVALIDATE_GAMES = 180;
export const PAGE_REVALIDATE_RELEASES = 180;
export const PAGE_REVALIDATE_STATUS = 120;
export const PAGE_REVALIDATE_NEWS = 120;

/** Default for server-side API reads (lists, dashboard blocks). */
export const FETCH_REVALIDATE_DEFAULT = 120;
