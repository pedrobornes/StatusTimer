export type GamePlatformLinkKey =
  | "official"
  | "steam"
  | "epic"
  | "youtube"
  | "reddit";

export type GameExternalLinks = Partial<Record<GamePlatformLinkKey, string>>;

export const GAME_PLATFORM_LINK_ORDER: GamePlatformLinkKey[] = [
  "official",
  "steam",
  "epic",
  "youtube",
  "reddit",
];

export interface GamePlatformLinkBrand {
  label: string;
  accentClass: string;
  ringClass: string;
}

export const GAME_PLATFORM_LINK_BRANDS: Record<
  GamePlatformLinkKey,
  GamePlatformLinkBrand
> = {
  official: {
    label: "Official website",
    accentClass: "from-sky-500/20 to-sky-900/10 text-sky-100",
    ringClass: "border-sky-400/25",
  },
  steam: {
    label: "Steam",
    accentClass: "from-slate-500/20 to-slate-900/10 text-slate-100",
    ringClass: "border-slate-400/25",
  },
  epic: {
    label: "Epic Games",
    accentClass: "from-white/10 to-slate-900/10 text-white",
    ringClass: "border-white/20",
  },
  youtube: {
    label: "YouTube",
    accentClass: "from-red-500/20 to-rose-900/10 text-red-100",
    ringClass: "border-red-400/25",
  },
  reddit: {
    label: "Reddit",
    accentClass: "from-orange-500/20 to-orange-900/10 text-orange-100",
    ringClass: "border-orange-400/25",
  },
};

export function resolveOrderedGameLinks(
  links?: GameExternalLinks | null,
): Array<{ key: GamePlatformLinkKey; url: string }> {
  if (!links) {
    return [];
  }

  return GAME_PLATFORM_LINK_ORDER.flatMap((key) => {
    const url = links[key]?.trim();
    return url ? [{ key, url }] : [];
  });
}

export function hasGameExternalLinks(links?: GameExternalLinks | null): boolean {
  return resolveOrderedGameLinks(links).length > 0;
}
