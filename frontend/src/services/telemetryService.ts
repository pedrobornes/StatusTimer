import { fetchJson } from "@/services/api";
import type {
  GameStatusDetail,
  GameTelemetry,
  TelemetryHistorySnapshot,
  TelemetryIncident,
} from "@/types/telemetry";

interface GameTelemetryOptions {
  featured?: boolean;
}

export function getGameTelemetry(
  options: GameTelemetryOptions = {},
): Promise<GameTelemetry[]> {
  const params = options.featured ? "?featured=true" : "";
  return fetchJson<GameTelemetry[]>(`/api/v1/telemetry${params}`);
}

export function getGameTelemetryBySlug(slug: string): Promise<GameTelemetry> {
  return fetchJson<GameTelemetry>(`/api/v1/telemetry/${slug}`);
}

export function getGameStatusDetail(slug: string): Promise<GameStatusDetail> {
  return fetchJson<GameStatusDetail>(`/api/v1/status/${slug}`);
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
