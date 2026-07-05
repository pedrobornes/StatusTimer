import type { SocialServiceSlug } from "@/types/social";

export interface SocialServiceBrand {
  label: string;
  initials: string;
  accentClass: string;
  ringClass: string;
  description: string;
}

export const SOCIAL_SERVICE_BRANDS: Record<SocialServiceSlug, SocialServiceBrand> = {
  whatsapp: {
    label: "WhatsApp",
    initials: "WA",
    accentClass: "from-emerald-500/20 to-emerald-900/10 text-emerald-100",
    ringClass: "border-emerald-400/25",
    description: "Messaging and voice connectivity",
  },
  instagram: {
    label: "Instagram",
    initials: "IG",
    accentClass: "from-fuchsia-500/20 via-rose-500/15 to-amber-500/10 text-fuchsia-100",
    ringClass: "border-fuchsia-400/25",
    description: "Photo, reels, and direct messages",
  },
  facebook: {
    label: "Facebook",
    initials: "FB",
    accentClass: "from-blue-500/20 to-indigo-900/10 text-blue-100",
    ringClass: "border-blue-400/25",
    description: "Feed, groups, and Messenger",
  },
  tiktok: {
    label: "TikTok",
    initials: "TT",
    accentClass: "from-cyan-500/15 via-fuchsia-500/15 to-rose-500/10 text-cyan-100",
    ringClass: "border-cyan-400/25",
    description: "Short-form video and live streams",
  },
  twitch: {
    label: "Twitch",
    initials: "TW",
    accentClass: "from-violet-500/20 to-purple-900/10 text-violet-100",
    ringClass: "border-violet-400/25",
    description: "Live streaming and chat services",
  },
};

export function isSocialServiceSlug(slug: string): slug is SocialServiceSlug {
  return slug in SOCIAL_SERVICE_BRANDS;
}

export function resolveSocialServiceBrand(slug: string): SocialServiceBrand | null {
  if (!isSocialServiceSlug(slug)) {
    return null;
  }

  return SOCIAL_SERVICE_BRANDS[slug];
}
