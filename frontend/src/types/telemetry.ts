export type TelemetryStatus = "ONLINE" | "MAINTENANCE" | "DOWN";

export type TelemetrySource = "STEAM_API" | "NETWORK_PROBE" | "STATUS_PAGE";

export interface GameTelemetry {
  id: number;
  gameSlug: string;
  status: TelemetryStatus;
  latencyMs: number;
  dataSource: TelemetrySource;
  lastChecked: string;
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
