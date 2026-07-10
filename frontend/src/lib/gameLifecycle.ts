import type { GameTelemetry } from "@/types/telemetry";

/** True when the game has not launched yet (release routing, not status). */
export function isUpcomingGameTelemetry(
  telemetry: GameTelemetry | null | undefined,
): boolean {
  if (!telemetry) {
    return false;
  }

  if (telemetry.status === "UPCOMING" || telemetry.isUpcoming === true) {
    return true;
  }

  const now = Date.now();
  const futureDates = [telemetry.releaseDate, telemetry.steamReleaseDate]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((timestamp) => Number.isFinite(timestamp));

  return futureDates.some((timestamp) => timestamp > now);
}
