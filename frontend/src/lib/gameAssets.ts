import type { GameTelemetry } from "@/types/telemetry";

export interface SearchableGame {
  slug: string;
  name: string;
  logoUrl: string | null;
}

export function buildSearchableGames(
  slugs: readonly string[],
  telemetryBySlug?: Record<string, GameTelemetry>,
): SearchableGame[] {
  return slugs.map((slug) => {
    const telemetry = telemetryBySlug?.[slug];
    const name = resolveGameDisplayName(slug, telemetry);
    const logoUrl = resolveGameLogoUrl(slug, telemetry);

    return { slug, name, logoUrl };
  });
}

const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

export interface GameAssetCatalogEntry {
  gameName: string;
  appId?: number;
  logoUrl?: string;
  coverUrl?: string;
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
    logoUrl:
      "https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/7b76209193f1bfe190d3ae6ef8728328870be9c3-736x138.png?accountingTag=VAL",
    coverUrl: "/images/games/valorant-cover.jpg",
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
  "gta-vi": {
    gameName: "Grand Theft Auto VI",
    isFeatured: true,
    logoUrl: "/images/games/gta-vi-logo.png",
    coverUrl: "/images/games/gta-vi-cover.jpg",
    isUpcoming: true,
    releaseDate: "2026-11-19",
  },
  fortnite: {
    gameName: "Fortnite",
    isFeatured: true,
    logoUrl:
      "https://cdn2.unrealengine.com/en-og-logo-egs-logo-350x100-350x100-ba7b388d26a7.png",
    coverUrl:
      "https://cdn2.unrealengine.com/en-fn-og-41-10-c1s9-egs-launcher-blade-2560x1440-2560x1440-d42b9403bb49.jpg",
  },
  "league-of-legends": {
    gameName: "League of Legends",
    logoUrl: "https://static.developer.riotgames.com/img/logo.png",
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

function steamCapsuleUrl(appId: number): string {
  return `${STEAM_CDN}/${appId}/capsule_184x69.jpg`;
}

function steamLibraryHeroUrl(appId: number): string {
  return `${STEAM_CDN}/${appId}/library_hero.jpg`;
}

function isLowResSteamHeader(url: string): boolean {
  return (
    url.includes("steamstatic.com/steam/apps/") && url.endsWith("/header.jpg")
  );
}

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

  return TRACKED_GAME_ASSETS[slug]?.gameName ?? slug;
}

function isBrokenRiotDarkroomUrl(url: string): boolean {
  return url.includes("riotgames.com/darkroom/original");
}

function isBrokenRockstarAkamaizedUrl(url: string): boolean {
  return url.includes("media-rockstargames-com.akamaized.net");
}

export function resolveGameLogoUrl(
  slug: string,
  telemetry?: Pick<GameTelemetry, "appId" | "logoUrl">,
): string | null {
  const catalog = TRACKED_GAME_ASSETS[slug];
  const catalogLogo = catalog?.logoUrl ?? null;

  if (telemetry?.logoUrl) {
    if (isBrokenRiotDarkroomUrl(telemetry.logoUrl) && catalogLogo) {
      return catalogLogo;
    }

    if (isBrokenRockstarAkamaizedUrl(telemetry.logoUrl) && catalogLogo) {
      return catalogLogo;
    }

    return telemetry.logoUrl;
  }

  if (catalogLogo) {
    return catalogLogo;
  }

  const appId = telemetry?.appId ?? catalog?.appId;
  if (appId != null) {
    return steamCapsuleUrl(appId);
  }

  return null;
}

export function resolveGameCoverUrl(
  slug: string,
  telemetry?: Pick<GameTelemetry, "appId" | "coverUrl">,
): string | null {
  const catalog = TRACKED_GAME_ASSETS[slug];
  const catalogCover = catalog?.coverUrl ?? null;

  if (telemetry?.coverUrl) {
    if (isBrokenRiotDarkroomUrl(telemetry.coverUrl) && catalogCover) {
      return catalogCover;
    }

    if (isBrokenRockstarAkamaizedUrl(telemetry.coverUrl) && catalogCover) {
      return catalogCover;
    }

    if (isLowResSteamHeader(telemetry.coverUrl)) {
      const appId = telemetry.appId ?? catalog?.appId;
      if (appId != null) {
        return steamLibraryHeroUrl(appId);
      }
    }

    if (
      slug === "valorant" &&
      catalogCover &&
      telemetry.coverUrl.includes("cmsassets.rgpub.io")
    ) {
      return catalogCover;
    }

    return telemetry.coverUrl;
  }

  if (catalogCover) {
    return catalogCover;
  }

  const appId = telemetry?.appId ?? catalog?.appId;
  if (appId != null) {
    return steamLibraryHeroUrl(appId);
  }

  return null;
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
