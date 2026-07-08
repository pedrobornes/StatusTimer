/**
 * Site-wide constants for legal pages, footer, and contact.
 */

export const SITE_NAME = "StatusTimer";

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

export const LEGAL_LAST_UPDATED = "July 7, 2026";

export function resolveContactMailto(): string | null {
  if (!CONTACT_EMAIL) {
    return null;
  }

  return `mailto:${CONTACT_EMAIL}`;
}
