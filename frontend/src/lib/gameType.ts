export type GameType = "multiplayer" | "single_player";

export function isSinglePlayerGame(
  telemetry?: { type?: GameType | null } | null,
): boolean {
  return telemetry?.type === "single_player";
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
