import type { GameTelemetry } from "@/types/telemetry";
import { formatSlugLabel } from "@/lib/telemetry";



export interface SearchableGame {

  slug: string;

  name: string;

  logoUrl: string | null;

}



const IGDB_IMAGE_HOST = "images.igdb.com";
const BLOCKED_HERO_IMAGE_IDS = new Set(["ar667x"]);

function extractIgdbImageId(url: string): string | null {
  const match = url.match(/\/t_[^/]+\/([^/.]+)\.jpg/i);
  return match?.[1] ?? null;
}

function isGameplayScreenshotHero(url: string): boolean {
  const imageId = extractIgdbImageId(url);
  return imageId !== null && imageId.toLowerCase().startsWith("sc");
}

export function isSuitableHeroUrl(url: string | null | undefined): boolean {
  if (!isIgdbImageUrl(url)) {
    return false;
  }

  const normalized = url!.trim();
  if (isVerticalCoverAsset(normalized)) {
    return false;
  }

  const imageId = extractIgdbImageId(normalized);
  if (imageId && BLOCKED_HERO_IMAGE_IDS.has(imageId)) {
    return false;
  }

  if (imageId && imageId.toLowerCase().startsWith("co")) {
    return false;
  }

  if (imageId && !imageId.toLowerCase().startsWith("ar")) {
    return false;
  }

  return !isGameplayScreenshotHero(normalized);
}



export function buildSearchableGames(

  slugs: readonly string[],

  telemetryBySlug?: Record<string, GameTelemetry>,

): SearchableGame[] {

  return slugs.map((slug) => {

    const telemetry = telemetryBySlug?.[slug];

    const name = resolveGameDisplayName(slug, telemetry);

    const logoUrl = resolveGameBoxArtUrl(slug, telemetry);



    return { slug, name, logoUrl };

  });

}



export interface GameAssetCatalogEntry {

  gameName: string;

  appId?: number;

  isUpcoming?: boolean;

  isFeatured?: boolean;

  releaseDate?: string;

}



const TRACKED_GAME_ASSETS: Record<string, GameAssetCatalogEntry> = {

  "counter-strike-2": {

    gameName: "Counter-Strike 2",

    appId: 730,

    isFeatured: true,

  },

  valorant: {

    gameName: "Valorant",

    isFeatured: true,

  },

  "dota-2": {

    gameName: "Dota 2",

    appId: 570,

    isFeatured: true,

  },

  pubg: {

    gameName: "PUBG: Battlegrounds",

    appId: 578080,

    isFeatured: true,

  },

  fortnite: {

    gameName: "Fortnite",

    isFeatured: true,

  },

  "league-of-legends": {

    gameName: "League of Legends",

  },

  minecraft: {

    gameName: "Minecraft",

  },

  roblox: {

    gameName: "Roblox",

  },

  "apex-legends": {

    gameName: "Apex Legends",

    appId: 1172470,

  },

  "call-of-duty": {

    gameName: "Call of Duty",

    appId: 1938090,

  },

  "gta-v": {

    gameName: "Grand Theft Auto V",

    appId: 271590,

  },

  "overwatch-2": {

    gameName: "Overwatch 2",

  },

  "rainbow-six-siege": {

    gameName: "Rainbow Six Siege",

    appId: 359550,

  },

  "rocket-league": {

    gameName: "Rocket League",

    appId: 252950,

  },

  "destiny-2": {

    gameName: "Destiny 2",

    appId: 1085660,

  },

  rust: {

    gameName: "Rust",

    appId: 252490,

  },

  "elden-ring": {

    gameName: "Elden Ring",

    appId: 1245620,

  },

};



export function getGameCatalogEntry(slug: string): GameAssetCatalogEntry | null {

  return TRACKED_GAME_ASSETS[slug] ?? null;

}



export function isFeaturedGameSlug(slug: string): boolean {

  return TRACKED_GAME_ASSETS[slug]?.isFeatured === true;

}



export function getFeaturedGameSlugs(slugs: readonly string[]): string[] {

  return slugs.filter((slug) => isFeaturedGameSlug(slug));

}



export function resolveGameDisplayName(

  slug: string,

  telemetry?: Pick<GameTelemetry, "gameName">,

): string {

  if (telemetry?.gameName) {

    return telemetry.gameName;

  }



  return TRACKED_GAME_ASSETS[slug]?.gameName ?? formatSlugLabel(slug);

}



export function formatIgdbRating(score: number | null | undefined): string | null {

  if (score == null || Number.isNaN(score)) {

    return null;

  }



  return `${(score / 10).toFixed(1)}/10`;

}



export function isValidLogoUrl(url: string | null | undefined): boolean {

  if (!url?.trim()) {

    return false;

  }



  return url.trim().toLowerCase() !== "none";

}



export function isIgdbImageUrl(url: string | null | undefined): boolean {

  if (!isValidLogoUrl(url)) {

    return false;

  }



  return url!.trim().toLowerCase().includes(IGDB_IMAGE_HOST);

}

export function resolveIgdbFullHdUrl(url: string): string {
  if (!isIgdbImageUrl(url)) {
    return url;
  }

  return url.replace(/\/t_[^/]+\//i, "/t_1080p/");
}



export function isRenderableLogoUrl(

  url: string | null | undefined,

): boolean {

  return isIgdbImageUrl(url);

}



export function resolveGameLogoUrl(

  slug: string,

  telemetry?: Pick<GameTelemetry, "logoUrl" | "coverUrl">,

): string | null {

  const logoUrl = telemetry?.logoUrl?.trim();

  if (logoUrl && isRenderableLogoUrl(logoUrl)) {

    return logoUrl;

  }



  return resolveGameCoverUrl(slug, telemetry);

}



export function isVerticalCoverAsset(url: string | null | undefined): boolean {
  if (!url?.trim()) {
    return false;
  }

  const normalized = url.toLowerCase();
  return normalized.includes("/t_cover") || normalized.includes("/t_thumb");
}

export function resolveGameCoverUrl(
  _slug: string,
  telemetry?: Pick<GameTelemetry, "coverUrl" | "logoUrl">,
): string | null {
  const hero = telemetry?.logoUrl?.trim();

  if (
    hero &&
    isRenderableLogoUrl(hero) &&
    isSuitableHeroUrl(hero) &&
    !isVerticalCoverAsset(hero)
  ) {
    return resolveIgdbFullHdUrl(hero);
  }

  return null;
}



export function resolveCatalogImageUrl(
  coverUrl?: string | null,
  logoUrl?: string | null,
): string | null {
  const normalizedCover = coverUrl ?? null;
  const normalizedLogo = logoUrl ?? null;

  if (isIgdbImageUrl(normalizedCover)) {
    return normalizedCover!.trim();
  }

  if (isIgdbImageUrl(normalizedLogo) && !isVerticalCoverAsset(normalizedLogo)) {
    return normalizedLogo!.trim();
  }

  if (isIgdbImageUrl(normalizedLogo) && shouldUseCoverFit(normalizedLogo)) {
    return normalizedLogo!.trim();
  }

  if (isIgdbImageUrl(normalizedLogo)) {
    return normalizedLogo!.trim();
  }

  return null;
}

export function resolveGameBoxArtUrl(

  slug: string,

  telemetry?: Pick<GameTelemetry, "logoUrl" | "coverUrl">,

): string | null {

  const coverUrl = telemetry?.coverUrl?.trim();

  if (coverUrl && isRenderableLogoUrl(coverUrl)) {

    return coverUrl;

  }



  const logoUrl = telemetry?.logoUrl?.trim();

  if (logoUrl && isRenderableLogoUrl(logoUrl)) {

    return logoUrl;

  }



  return null;

}



export function shouldUseCoverFit(url: string | null): boolean {

  if (!url) {

    return false;

  }



  const normalized = url.toLowerCase();

  return normalized.includes("t_thumb") || normalized.includes("t_cover_small");

}



export function getGameInitials(name: string): string {

  const words = name

    .split(/[\s:-]+/)

    .map((word) => word.trim())

    .filter(Boolean);



  if (words.length === 0) {

    return "?";

  }



  if (words.length === 1) {

    return words[0].slice(0, 2).toUpperCase();

  }



  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();

}



export function isGameUpcoming(

  telemetry: Pick<GameTelemetry, "isUpcoming" | "status" | "gameSlug">,

): boolean {

  if (telemetry.isUpcoming === true) {

    return true;

  }



  if (telemetry.status === "UPCOMING") {

    return true;

  }



  return TRACKED_GAME_ASSETS[telemetry.gameSlug]?.isUpcoming === true;

}



export function resolveGameReleaseDate(

  slug: string,

  telemetry?: Pick<GameTelemetry, "releaseDate">,

): string | null {

  if (telemetry?.releaseDate) {

    return telemetry.releaseDate;

  }



  return TRACKED_GAME_ASSETS[slug]?.releaseDate ?? null;

}



export function isSlugLiveTracked(

  slug: string,

  telemetry?: GameTelemetry,

): boolean {

  if (telemetry) {

    return !isGameUpcoming(telemetry);

  }



  return TRACKED_GAME_ASSETS[slug]?.isUpcoming !== true;

}



export function filterLiveTelemetrySlugs(

  slugs: readonly string[],

  telemetryBySlug: Record<string, GameTelemetry>,

): string[] {

  return slugs.filter((slug) =>

    isSlugLiveTracked(slug, telemetryBySlug[slug]),

  );

}


