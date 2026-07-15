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

export function shouldShowSearchLiveMetrics(
  game: {
    steamAppId?: number | null;
    livePlayers?: number | null;
    twitchViewers?: number | null;
  },
): boolean {
  return (
    game.livePlayers != null ||
    game.twitchViewers != null ||
    canTrackSteamPlayers({ appId: game.steamAppId })
  );
}
