import type { SocialServiceSlug } from "@/types/social";

export interface SocialServiceBrand {
  label: string;
  initials: string;
  logoUrl: string;
  accentClass: string;
  ringClass: string;
  description: string;
}

const SOCIAL_LOGO_BASE = "/images/logos/social";

export const SOCIAL_SERVICE_BRANDS: Record<SocialServiceSlug, SocialServiceBrand> = {
  whatsapp: {
    label: "WhatsApp",
    initials: "WA",
    logoUrl: `${SOCIAL_LOGO_BASE}/whatsapp.svg`,
    accentClass: "from-emerald-500/20 to-emerald-900/10 text-emerald-100",
    ringClass: "border-emerald-400/25",
    description: "Messaging and voice connectivity",
  },
  instagram: {
    label: "Instagram",
    initials: "IG",
    logoUrl: `${SOCIAL_LOGO_BASE}/instagram.svg`,
    accentClass: "from-fuchsia-500/20 via-rose-500/15 to-amber-500/10 text-fuchsia-100",
    ringClass: "border-fuchsia-400/25",
    description: "Photo, reels, and direct messages",
  },
  facebook: {
    label: "Facebook",
    initials: "FB",
    logoUrl: `${SOCIAL_LOGO_BASE}/facebook.svg`,
    accentClass: "from-blue-500/20 to-indigo-900/10 text-blue-100",
    ringClass: "border-blue-400/25",
    description: "Feed, groups, and Messenger",
  },
  tiktok: {
    label: "TikTok",
    initials: "TT",
    logoUrl: `${SOCIAL_LOGO_BASE}/tiktok.svg`,
    accentClass: "from-cyan-500/15 via-fuchsia-500/15 to-rose-500/10 text-cyan-100",
    ringClass: "border-cyan-400/25",
    description: "Short-form video and live streams",
  },
  twitch: {
    label: "Twitch",
    initials: "TW",
    logoUrl: `${SOCIAL_LOGO_BASE}/twitch.svg`,
    accentClass: "from-violet-500/20 to-purple-900/10 text-violet-100",
    ringClass: "border-violet-400/25",
    description: "Live streaming and chat services",
  },
  youtube: {
    label: "YouTube",
    initials: "YT",
    logoUrl: `${SOCIAL_LOGO_BASE}/youtube.svg`,
    accentClass: "from-red-500/20 to-rose-900/10 text-red-100",
    ringClass: "border-red-400/25",
    description: "Video uploads, Shorts, and live broadcasts",
  },
  x: {
    label: "X",
    initials: "X",
    logoUrl: `${SOCIAL_LOGO_BASE}/x.svg`,
    accentClass: "from-slate-200/15 to-slate-900/10 text-slate-100",
    ringClass: "border-slate-400/25",
    description: "Posts, replies, and direct messages",
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
