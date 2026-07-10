import type { GameCatalogSearchResult } from "@/services/catalogService";
import type { GameTelemetry } from "@/types/telemetry";

export function mapCatalogSearchToTelemetry(
  entry: GameCatalogSearchResult,
): GameTelemetry {
  const isUpcoming = entry.upcomingRelease === true;

  return {
    id: entry.id,
    gameSlug: entry.slug,
    gameName: entry.gameName,
    status: isUpcoming ? "UPCOMING" : "ONLINE",
    latencyMs: 0,
    dataSource: "NETWORK_PROBE",
    lastChecked: new Date(0).toISOString(),
    logoUrl: entry.logoUrl ?? undefined,
    coverUrl: entry.coverUrl ?? undefined,
    appId: entry.steamAppId ?? undefined,
    userRating: entry.userRating,
    criticRating: entry.criticRating,
    genreName: entry.genreName,
    genreNames: entry.genreNames,
    livePlayers: entry.livePlayers,
    twitchViewers: entry.twitchViewers,
    isUpcoming,
  };
}
