import type { TelemetryStatus } from "@/types/telemetry";

export type GameType = "multiplayer" | "single_player";

export function isSinglePlayerGame(
  telemetry?: { type?: GameType | null } | null,
): boolean {
  return telemetry?.type === "single_player";
}

export function resolvePublicTelemetryStatus(
  telemetry?: {
    type?: GameType | null;
    status?: TelemetryStatus | null;
  } | null,
): TelemetryStatus | null {
  if (!telemetry?.status) {
    return null;
  }

  if (
    isSinglePlayerGame(telemetry) &&
    (telemetry.status === "MAINTENANCE" || telemetry.status === "DOWN")
  ) {
    return "ONLINE";
  }

  return telemetry.status;
}

export function canTrackSteamPlayers(
  telemetry?: {
    appId?: number | null;
    playersTrackable?: boolean | null;
  } | null,
): boolean {
  if (telemetry?.playersTrackable != null) {
    return telemetry.playersTrackable;
  }

  return telemetry?.appId != null && telemetry.appId > 0;
}

export function shouldShowSearchLiveMetrics(
  game: {
    livePlayers?: number | null;
    twitchViewers?: number | null;
  },
): boolean {
  return game.livePlayers != null || game.twitchViewers != null;
}
