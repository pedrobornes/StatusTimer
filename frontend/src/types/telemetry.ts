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
