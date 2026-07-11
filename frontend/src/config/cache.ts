/**
 * ISR / fetch revalidate seconds — tuned for Railway Hobby cost control.
 * Harvester cycle is ~15 min; 10 min page cache keeps data fresh enough.
 *
 * App routes must use the literal: `export const revalidate = 600`
 * (Next.js cannot statically analyze imported segment config).
 */
export const PAGE_REVALIDATE_SECONDS = 600;

/** Default for server-side API reads (lists, dashboard blocks). */
export const FETCH_REVALIDATE_DEFAULT = 600;
