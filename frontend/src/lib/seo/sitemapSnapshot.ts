import type { GameIndexableSlug } from "@/services/catalogService";

let lastSuccessfulSlugs: GameIndexableSlug[] | null = null;

export function rememberSitemapSlugs(slugs: GameIndexableSlug[]): void {
  lastSuccessfulSlugs = slugs;
}

export function getLastSuccessfulSitemapSlugs(): GameIndexableSlug[] | null {
  return lastSuccessfulSlugs;
}
