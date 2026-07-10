/**
 * Site-wide constants for legal pages, footer, and contact.
 */

export const SITE_NAME = "StatusTimer";

export const DEFAULT_CONTACT_EMAIL = "info@status-timer.com";

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL;

export const LEGAL_LAST_UPDATED = "July 9, 2026";

const DEFAULT_LOCAL_SITE_URL = "http://localhost:3000";
const PRODUCTION_CANONICAL_HOST = "www.status-timer.com";

/**
 * Canonical public site origin for SEO (sitemap, robots, metadata, JSON-LD).
 * Normalizes apex `status-timer.com` → `https://www.status-timer.com`.
 */
export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_LOCAL_SITE_URL;

  try {
    const parsed = new URL(raw);

    if (
      parsed.hostname === "status-timer.com" ||
      parsed.hostname === "www.status-timer.com"
    ) {
      parsed.protocol = "https:";
      parsed.hostname = PRODUCTION_CANONICAL_HOST;
      parsed.pathname = "";
      parsed.search = "";
      parsed.hash = "";
    }

    return parsed.origin;
  } catch {
    return raw.replace(/\/$/, "") || DEFAULT_LOCAL_SITE_URL;
  }
}

export function resolveContactMailto(): string | null {
  if (!CONTACT_EMAIL) {
    return null;
  }

  return `mailto:${CONTACT_EMAIL}`;
}
