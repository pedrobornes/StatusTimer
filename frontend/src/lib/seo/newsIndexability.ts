import { normalizeBoldSpacing } from "@/lib/intelFeed";

const PLACEHOLDER_PHRASES = [
  "read the full announcement",
  "read the full announcement here",
  "click here to read",
  "read more on steam",
  "read more here",
  "view the full patch notes",
] as const;

const MIN_INDEXABLE_NEWS_CHARS = 120;

export function substantiveNewsText(content: string): string {
  return normalizeBoldSpacing(content)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when an article has enough unique body text to earn an index slot. */
export function isIndexableNewsContent(content: string): boolean {
  const substantive = substantiveNewsText(content);
  if (!substantive) {
    return false;
  }

  const lowered = substantive.toLowerCase().replace(/[!?.]+$/g, "");
  const hasPlaceholder = PLACEHOLDER_PHRASES.some((phrase) =>
    lowered.includes(phrase),
  );

  if (hasPlaceholder) {
    let remainder = lowered;
    for (const phrase of PLACEHOLDER_PHRASES) {
      remainder = remainder.replaceAll(phrase, " ");
    }
    remainder = remainder.replace(/\s+/g, " ").trim();
    if (remainder.length < 40) {
      return false;
    }
  }

  if (substantive.length < MIN_INDEXABLE_NEWS_CHARS) {
    return substantive.length >= 60 && !hasPlaceholder;
  }

  return true;
}
