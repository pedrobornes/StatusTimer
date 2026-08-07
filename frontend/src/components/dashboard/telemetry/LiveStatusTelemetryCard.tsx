"use client";

import { useEffect, useState } from "react";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import { getGameTelemetryBySlug } from "@/services/telemetryService";
import type { PlatformDetail } from "@/types/api";
import type { GameTelemetry } from "@/types/telemetry";
import { parseBackendDate } from "@/utils/dateFormatter";

/** Keep status ISR long; live card hydrates metrics without waiting for revalidate. */
const LIVE_REFRESH_MS = 60_000;

interface LiveStatusTelemetryCardProps {
  initialTelemetry: GameTelemetry;
  platforms?: PlatformDetail[];
  catalogOnly?: boolean;
  serverStatusPending?: boolean;
  /** When false, render the SSR snapshot only (pending probe / catalog shells). */
  enableLiveRefresh?: boolean;
}

function timestampMs(value: GameTelemetry["lastChecked"]): number {
  return parseBackendDate(value)?.getTime() ?? Number.NEGATIVE_INFINITY;
}

/** Prefer fresher lastChecked and keep any live metrics already on screen. */
export function mergeLiveTelemetry(
  previous: GameTelemetry,
  latest: GameTelemetry,
): GameTelemetry {
  const preferPreviousChecked =
    timestampMs(previous.lastChecked) > timestampMs(latest.lastChecked);

  return {
    ...previous,
    ...latest,
    lastChecked: preferPreviousChecked
      ? previous.lastChecked
      : (latest.lastChecked ?? previous.lastChecked),
    livePlayers: latest.livePlayers ?? previous.livePlayers,
    twitchViewers: latest.twitchViewers ?? previous.twitchViewers,
  };
}

export default function LiveStatusTelemetryCard({
  initialTelemetry,
  platforms,
  catalogOnly = false,
  serverStatusPending = false,
  enableLiveRefresh = true,
}: LiveStatusTelemetryCardProps) {
  const [telemetry, setTelemetry] = useState(initialTelemetry);

  useEffect(() => {
    setTelemetry(initialTelemetry);
  }, [initialTelemetry]);

  useEffect(() => {
    if (!enableLiveRefresh || serverStatusPending || catalogOnly) {
      return undefined;
    }

    const gameSlug = initialTelemetry.gameSlug;
    let cancelled = false;

    async function refresh() {
      try {
        const latest = await getGameTelemetryBySlug(gameSlug, {
          cache: "no-store",
        });
        if (!cancelled) {
          setTelemetry((previous) => mergeLiveTelemetry(previous, latest));
        }
      } catch {
        // Keep the SSR snapshot if the live refresh fails.
      }
    }

    // Hydrate immediately so ISR-stale HTML does not flash soft "few hours" copy.
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, LIVE_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [
    catalogOnly,
    enableLiveRefresh,
    initialTelemetry.gameSlug,
    serverStatusPending,
  ]);

  return (
    <GameTelemetryCard
      telemetry={telemetry}
      linkToStatusPage={false}
      linkToProfile={false}
      platforms={platforms}
      catalogOnly={catalogOnly}
      serverStatusPending={serverStatusPending}
      embedded
    />
  );
}
