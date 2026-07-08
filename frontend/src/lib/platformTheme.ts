import type { GamePlatform } from "@/types/api";

const PLATFORM_LOGO_BASE = "/images/logos/platforms";

export interface PlatformTheme {
  label: string;
  color: string;
  background: string;
  border: string;
  logoUrl: string;
}

/** Ghost-style platform badges tuned for the dark StatusTimer shell. */
export const PLATFORM_THEME: Record<GamePlatform, PlatformTheme> = {
  PC: {
    label: "PC",
    color: "#66c0f4",
    background: "rgba(102, 192, 244, 0.14)",
    border: "rgba(102, 192, 244, 0.32)",
    logoUrl: `${PLATFORM_LOGO_BASE}/windows.svg`,
  },
  PS5: {
    label: "PS5",
    color: "#6b9ef0",
    background: "rgba(77, 130, 219, 0.16)",
    border: "rgba(77, 130, 219, 0.34)",
    logoUrl: `${PLATFORM_LOGO_BASE}/playstation.svg`,
  },
  XBOX: {
    label: "Xbox",
    color: "#5cb85c",
    background: "rgba(16, 124, 16, 0.18)",
    border: "rgba(16, 124, 16, 0.38)",
    logoUrl: `${PLATFORM_LOGO_BASE}/xbox.svg`,
  },
  SWITCH: {
    label: "Switch",
    color: "#ff6b7a",
    background: "rgba(230, 0, 18, 0.14)",
    border: "rgba(230, 0, 18, 0.32)",
    logoUrl: `${PLATFORM_LOGO_BASE}/switch.svg`,
  },
  SWITCH_2: {
    label: "Switch 2",
    color: "#ff8a96",
    background: "rgba(230, 0, 18, 0.12)",
    border: "rgba(230, 0, 18, 0.28)",
    logoUrl: `${PLATFORM_LOGO_BASE}/switch.svg`,
  },
};

export function getPlatformTheme(platform: GamePlatform): PlatformTheme {
  return PLATFORM_THEME[platform];
}
