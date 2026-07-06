/**
 * Canonical route builders for SEO-friendly URL patterns.
 */

import { getFeaturedGameSlugs } from "@/lib/gameAssets";

export const TRACKED_GAME_SLUGS = [
  "counter-strike-2",
  "valorant",
  "dota-2",
  "pubg",
  "fortnite",
  "league-of-legends",
  "minecraft",
  "roblox",
  "apex-legends",
  "call-of-duty",
  "gta-v",
  "overwatch-2",
  "rainbow-six-siege",
  "rocket-league",
  "destiny-2",
  "rust",
  "elden-ring",
] as const;

export const FEATURED_GAME_SLUGS = getFeaturedGameSlugs(TRACKED_GAME_SLUGS);

export type TrackedGameSlug = (typeof TRACKED_GAME_SLUGS)[number];

export const APP_ROUTES = {
  home: "/",
  telemetry: "/telemetry",
  releases: "/releases",
  intel: "/intel",
  release: (slug: string) => `/release/${slug}`,
  status: (slug: string) => `/status/${slug}`,
} as const;

export function buildStatusPath(slug: string): string {
  return APP_ROUTES.status(slug);
}

export function isTrackedGameSlug(slug: string): slug is TrackedGameSlug {
  return (TRACKED_GAME_SLUGS as readonly string[]).includes(slug);
}

export function buildGameStatusTitle(gameName: string): string {
  return `Is ${gameName} Down Right Now? Live Server Status & Outages`;
}

export function buildGameStatusDescription(gameName: string): string {
  return `Check if ${gameName} servers are down or having problems. Live status, recent outages, and real-time updates.`;
}

export function buildGameStatusKeywords(gameName: string, gameSlug: string): string[] {
  return [
    `${gameName} server status`,
    `is ${gameName.toLowerCase()} down`,
    `${gameName} outage`,
    `${gameName} servers down`,
    `${gameSlug} status`,
    "live server status",
    "multiplayer outage tracker",
  ];
}
