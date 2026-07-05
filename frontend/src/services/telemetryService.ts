import { fetchJson } from "@/services/api";
import type {
  GameTelemetry,
  TelemetryHistorySnapshot,
  TelemetryIncident,
} from "@/types/telemetry";

export function getGameTelemetry(): Promise<GameTelemetry[]> {
  return fetchJson<GameTelemetry[]>("/api/v1/telemetry");
}

export function getGameTelemetryBySlug(slug: string): Promise<GameTelemetry> {
  return fetchJson<GameTelemetry>(`/api/v1/telemetry/${slug}`);
}

export function getTelemetryHistory(
  gameSlug: string,
): Promise<TelemetryHistorySnapshot[]> {
  const params = new URLSearchParams({ game: gameSlug });
  return fetchJson<TelemetryHistorySnapshot[]>(
    `/api/v1/telemetry/history?${params.toString()}`,
  );
}

export function getTelemetryIncidents(): Promise<TelemetryIncident[]> {
  return fetchJson<TelemetryIncident[]>("/api/v1/telemetry/incidents");
}
