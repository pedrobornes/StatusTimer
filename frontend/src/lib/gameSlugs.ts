const SLUG_ALIASES: Record<string, string> = {
  "mecha-chameleon": "meccha-chameleon",
};

export function resolveCanonicalGameSlug(slug: string): string {
  return SLUG_ALIASES[slug] ?? slug;
}
