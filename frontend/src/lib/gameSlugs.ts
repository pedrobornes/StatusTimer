const SLUG_ALIASES: Record<string, string> = {
  "mecha-chameleon": "meccha-chameleon",
  "diablo-iv": "diablo-4",
  "overwatch": "overwatch-2",
};

export function resolveCanonicalGameSlug(slug: string): string {
  return SLUG_ALIASES[slug] ?? slug;
}
