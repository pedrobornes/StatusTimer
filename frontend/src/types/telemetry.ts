import type { GamingNews } from "@/types/api";

export type TelemetryStatus = "ONLINE" | "MAINTENANCE" | "DOWN" | "UPCOMING";

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
  genreName?: string | null;
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

export interface GameStatusDetail {
  telemetry: GameTelemetry | null;
  history: TelemetryHistorySnapshot[];
  incidents: TelemetryIncident[];
  news: GamingNews[];
  telemetryReady: boolean;
  firstMonitoredAt?: string | null;
  uptime?: TelemetryUptimeSummary | null;
}
