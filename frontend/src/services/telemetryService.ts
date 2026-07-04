import { fetchJson } from "@/services/apiClient";
import type { GameTelemetry } from "@/types/telemetry";

export function getGameTelemetry(): Promise<GameTelemetry[]> {
  return fetchJson<GameTelemetry[]>("/api/v1/telemetry");
}

export function getGameTelemetryBySlug(slug: string): Promise<GameTelemetry> {
  return fetchJson<GameTelemetry>(`/api/v1/telemetry/${slug}`);
}
