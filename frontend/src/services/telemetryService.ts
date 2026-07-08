import type { ApiRequestOptions } from "@/services/api";
import { fetchJson } from "@/services/api";
import { mapCatalogSearchToTelemetry } from "@/lib/catalogTelemetry";
import { searchGames } from "@/services/catalogService";
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
  options: GameTelemetryOptions & ApiRequestOptions = {},
): Promise<GameTelemetry[]> {
  const { featured, ...fetchOptions } = options;
  const params = featured ? "?featured=true" : "";
  return fetchJson<GameTelemetry[]>(`/api/v1/telemetry${params}`, fetchOptions);
}

export function getDashboardTelemetry(
  limit = 6,
  options: ApiRequestOptions = {},
): Promise<GameTelemetry[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  return fetchJson<GameTelemetry[]>(
    `/api/v1/telemetry/dashboard?${params.toString()}`,
    options,
  );
}

export async function searchGameTelemetry(query: string): Promise<GameTelemetry[]> {
  const catalog = await searchGames(query);
  return catalog.map(mapCatalogSearchToTelemetry);
}

export function getTelemetryReady(slug: string): Promise<{ slug: string; ready: boolean }> {
  return fetchJson<{ slug: string; ready: boolean }>(
    `/api/v1/telemetry/${slug}/ready`,
    { revalidate: 0, cache: "no-store" },
  );
}

export function getGameTelemetryBySlug(slug: string): Promise<GameTelemetry> {
  return fetchJson<GameTelemetry>(`/api/v1/telemetry/${slug}`);
}

export function getGameStatusDetail(
  slug: string,
  options?: ApiRequestOptions,
): Promise<GameStatusDetail> {
  return fetchJson<GameStatusDetail>(`/api/v1/status/${slug}`, options);
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
