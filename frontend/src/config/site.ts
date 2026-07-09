/**
 * Site-wide constants for legal pages, footer, and contact.
 */

export const SITE_NAME = "StatusTimer";

export const DEFAULT_CONTACT_EMAIL = "info@status-timer.com";

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL;

export const LEGAL_LAST_UPDATED = "July 9, 2026";

export function resolveContactMailto(): string | null {
  if (!CONTACT_EMAIL) {
    return null;
  }

  return `mailto:${CONTACT_EMAIL}`;
}
