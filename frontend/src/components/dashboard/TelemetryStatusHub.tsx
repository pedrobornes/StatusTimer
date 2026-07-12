"use client";

import { useMemo } from "react";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import TelemetryGamesPanel from "@/components/dashboard/TelemetryGamesPanel";
import type { PlatformDetail, ServerStatus } from "@/types/api";
import type {
  GameTelemetry,
  TelemetryIncident,
} from "@/types/telemetry";

interface TelemetryStatusHubProps {
  statuses: ServerStatus[];
  gameTelemetry: GameTelemetry[];
  platformsBySlug: Record<string, PlatformDetail[]>;
  incidents: TelemetryIncident[];
  unreleasedSlugs?: string[];
  catalogTotal?: number;
}

export default function TelemetryStatusHub({
  statuses,
  gameTelemetry,
  platformsBySlug,
  incidents,
  unreleasedSlugs = [],
  catalogTotal,
}: TelemetryStatusHubProps) {
  const upcomingGameSlugs = useMemo(() => {
    const fromTelemetry = gameTelemetry
      .filter((entry) => entry.isUpcoming === true || entry.status === "UPCOMING")
      .map((entry) => entry.gameSlug);

    return [...new Set([...fromTelemetry, ...unreleasedSlugs])];
  }, [gameTelemetry, unreleasedSlugs]);

  const socialPlatformAlerts = useMemo(
    () =>
      statuses.filter(
        (status) => status.category === "SOCIAL" && status.isUp === false,
      ),
    [statuses],
  );

  return (
    <div className="space-y-8">
      <TelemetryGamesPanel
        gameTelemetry={gameTelemetry}
        platformsBySlug={platformsBySlug}
        catalogTotal={catalogTotal}
      />

      <IncidentLog
        incidents={incidents}
        platformAlerts={socialPlatformAlerts}
        excludedGameSlugs={upcomingGameSlugs}
        sectionTitle="Recent Problems"
        eyebrow="Down & Maintenance"
      />
    </div>
  );
}
