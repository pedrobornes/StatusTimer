import type { ApiRequestOptions } from "@/services/api";
import { fetchJson } from "@/services/api";
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
  if (catalog.length === 0) {
    return [];
  }

  const telemetry = await Promise.all(
    catalog.map(async (game) => {
      try {
        return await getGameTelemetryBySlug(game.slug);
      } catch {
        return null;
      }
    }),
  );

  return telemetry.filter((entry): entry is GameTelemetry => entry !== null);
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
