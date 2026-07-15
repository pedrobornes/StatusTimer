import type { GamingNews } from "@/types/api";

export type TelemetryStatus = "ONLINE" | "MAINTENANCE" | "DOWN" | "UPCOMING";

export type GameType = "multiplayer" | "single_player";

export type TelemetrySource = "STEAM_API" | "NETWORK_PROBE" | "STATUS_PAGE";

export interface GameTelemetry {
  id: number;
  gameSlug: string;
  gameName?: string;
  status: TelemetryStatus;
  latencyMs: number;
  dataSource: TelemetrySource;
  lastChecked: string;
  appId?: number;
  logoUrl?: string;
  coverUrl?: string;
  isUpcoming?: boolean;
  releaseDate?: string | null;
  twitchRank?: number | null;
  twitchGameId?: string | null;
  steamReleaseDate?: string | null;
  steamAdultContent?: boolean;
  livePlayers?: number | null;
  twitchViewers?: number | null;
  isIndexable?: boolean;
  lifecycleState?: "CATALOG" | "MONITORED" | "INDEXABLE";
  userRating?: number | null;
  criticRating?: number | null;
  steamReviewCount?: number | null;
  steamReviewScorePercent?: number | null;
  genreName?: string | null;
  genreNames?: string[];
  type?: GameType;
  playersTrackable?: boolean;
  screenshotUrls?: string[];
  trailerVideoIds?: string[];
  youtubeChannelUrl?: string | null;
}

export interface TelemetryHistorySnapshot {
  timestamp?: string;
  publishedAt?: string;
  status: TelemetryStatus;
  dataSource: TelemetrySource;
}

export interface TelemetryIncident {
  gameSlug: string;
  status: TelemetryStatus;
  dataSource: TelemetrySource;
  publishedAt?: string;
  timestamp?: string;
}

export interface TelemetryUptimeSummary {
  uptime7dPercent: number | null;
  uptime30dPercent: number | null;
}

export interface SteamStoreListing {
  steamAppId: number;
  shortDescription?: string | null;
  priceFinal?: number | null;
  currency?: string | null;
  windows?: boolean;
  mac?: boolean;
  linux?: boolean;
  freeToPlay?: boolean;
}

export interface GameStatusDetail {
  gameName?: string;
  telemetry: GameTelemetry | null;
  history: TelemetryHistorySnapshot[];
  incidents: TelemetryIncident[];
  news: GamingNews[];
  telemetryReady: boolean;
  catalogOnly?: boolean;
  firstMonitoredAt?: string | null;
  uptime?: TelemetryUptimeSummary | null;
  steamStore?: SteamStoreListing | null;
  screenshotUrls?: string[];
  trailerVideoIds?: string[];
  youtubeChannelUrl?: string | null;
  externalLinks?: Record<string, string>;
}
