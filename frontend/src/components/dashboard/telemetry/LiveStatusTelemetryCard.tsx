"use client";

import { useEffect, useState } from "react";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import { getGameTelemetryBySlug } from "@/services/telemetryService";
import type { PlatformDetail } from "@/types/api";
import type { GameTelemetry } from "@/types/telemetry";

/** Client poll so /status ISR can stay long without stale UP/DOWN for users. */
const LIVE_REFRESH_MS = 60_000;
const FIRST_REFRESH_MS = 5_000;

interface LiveStatusTelemetryCardProps {
  initialTelemetry: GameTelemetry;
  platforms?: PlatformDetail[];
  catalogOnly?: boolean;
  serverStatusPending?: boolean;
  /** When false, render the SSR snapshot only (pending probe / catalog shells). */
  enableLiveRefresh?: boolean;
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
          setTelemetry((previous) => ({ ...previous, ...latest }));
        }
      } catch {
        // Keep the SSR snapshot if the live refresh fails.
      }
    }

    const firstRefreshId = window.setTimeout(() => {
      void refresh();
    }, FIRST_REFRESH_MS);

    const intervalId = window.setInterval(() => {
      void refresh();
    }, LIVE_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(firstRefreshId);
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
