/**
 * Central SEO copy aligned with what StatusTimer actually monitors.
 * Games: online / down / maintenance. Social: Twitch, TikTok, YouTube,
 * WhatsApp, Facebook, Instagram, and X — not Discord or Steam platform status.
 */

export const MONITORED_SOCIAL_PLATFORMS = [
  "Twitch",
  "TikTok",
  "YouTube",
  "WhatsApp",
  "Facebook",
  "Instagram",
  "X",
] as const;

export const MONITORED_SOCIAL_PLATFORMS_TEXT =
  MONITORED_SOCIAL_PLATFORMS.join(", ");

export const SITE_DEFAULT_DESCRIPTION =
  "Check if game servers are down, see live outage status, and read official patch notes and updates. Monitor multiplayer titles plus social platform connectivity for Twitch, TikTok, YouTube, WhatsApp, Facebook, Instagram, and X.";

export const HOME_PAGE_DESCRIPTION =
  "Live game server status, patch notes, game updates, social platform checks, and release countdowns — all in one place.";

export const HOME_PAGE_OG_TITLE =
  "StatusTimer | Live Game & Social Platform Status";

/** Visible hero copy on the home dashboard — keep in sync with HOME_PAGE_DESCRIPTION. */
export const HOME_HERO_SUBTITLE =
  "Live game server status, patch notes, game updates, social platform checks, and release countdowns — all in one place.";

export const GAMING_SECTION_SUBTITLE =
  "Online, down, or maintenance — with player counts, patch notes, and Twitch viewership for tracked titles.";

export const GAMES_PAGE_SUBTITLE =
  "Game server status, patch notes, player activity, and recent outages for every tracked title.";

export const SITE_DEFAULT_KEYWORDS = [
  "gaming server status",
  "is game down",
  "is game servers down",
  "game server maintenance",
  "game patch notes",
  "game update",
  "multiplayer server monitor",
  "live server status",
  "social platform status",
  "is Twitch down",
  "is Instagram down",
  "is WhatsApp down",
  "is TikTok down",
  "is YouTube down",
  "is Facebook down",
  "is X down",
  "upcoming game release dates",
  "game release countdown",
  "gaming news",
  "Fortnite server status",
  "Fortnite patch notes",
  "Valorant server status",
  "Valorant patch notes",
  "League of Legends server status",
  "League of Legends patch notes",
  "Teamfight Tactics patch notes",
  "World of Warcraft patch notes",
  "Diablo 4 patch notes",
  "Hearthstone patch notes",
  "Overwatch patch notes",
  "Call of Duty server status",
  "Apex Legends server status",
  "Minecraft server status",
  "Roblox server status",
] as const;
