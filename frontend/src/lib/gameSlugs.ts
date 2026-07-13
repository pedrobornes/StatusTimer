const SLUG_ALIASES: Record<string, string> = {
  "mecha-chameleon": "meccha-chameleon",
  "counter-strike": "counter-strike-2",
  "gta-v": "grand-theft-auto-v",
  "grand-theft-auto-v-legacy": "grand-theft-auto-v",
  "grand-theft-auto-v-enhanced": "grand-theft-auto-v",
  "overwatch-2": "overwatch",
  "diablo-iv": "diablo-4",
  "pubg-battlegrounds": "pubg",
  "apex-legends-1": "apex-legends",
};

const ROMAN_SUFFIXES: Record<string, string> = {
  i: "1",
  ii: "2",
  iii: "3",
  iv: "4",
  v: "5",
  vi: "6",
  vii: "7",
  viii: "8",
  ix: "9",
  x: "10",
};

const NOISE_SUFFIXES = ["tm", "r"] as const;

function normalizeCatalogSlug(slug: string): string {
  let normalized = slug.trim().toLowerCase();

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of NOISE_SUFFIXES) {
      const marker = `-${suffix}`;
      if (normalized.endsWith(marker)) {
        normalized = normalized.slice(0, -marker.length);
        changed = true;
      }
    }
  }

  const separator = normalized.lastIndexOf("-");
  if (separator > 0) {
    const romanSuffix = normalized.slice(separator + 1);
    if (romanSuffix.length >= 2) {
      const arabicSuffix = ROMAN_SUFFIXES[romanSuffix];
      if (arabicSuffix) {
        normalized = `${normalized.slice(0, separator + 1)}${arabicSuffix}`;
      }
    }
  }

  return SLUG_ALIASES[normalized] ?? normalized;
}

export function resolveCanonicalGameSlug(slug: string): string {
  return normalizeCatalogSlug(slug);
}
