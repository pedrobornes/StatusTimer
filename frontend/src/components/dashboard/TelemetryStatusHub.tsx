"use client";

import { useMemo } from "react";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import SocialPlatformsSection from "@/components/dashboard/SocialPlatformsSection";
import TelemetryGamesPanel from "@/components/dashboard/TelemetryGamesPanel";
import type { PlatformDetail, ServerStatus } from "@/types/api";
import type {
  GameTelemetry,
  TelemetryHistorySnapshot,
  TelemetryIncident,
} from "@/types/telemetry";

interface TelemetryStatusHubProps {
  statuses: ServerStatus[];
  gameTelemetry: GameTelemetry[];
  telemetryHistoryBySlug: Record<string, TelemetryHistorySnapshot[]>;
  platformsBySlug: Record<string, PlatformDetail[]>;
  incidents: TelemetryIncident[];
  catalogTotal?: number;
}

export default function TelemetryStatusHub({
  statuses,
  gameTelemetry,
  telemetryHistoryBySlug,
  platformsBySlug,
  incidents,
  catalogTotal,
}: TelemetryStatusHubProps) {
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
        telemetryHistoryBySlug={telemetryHistoryBySlug}
        platformsBySlug={platformsBySlug}
        catalogTotal={catalogTotal}
      />

      <SocialPlatformsSection statuses={statuses} />

      <IncidentLog
        incidents={incidents}
        platformAlerts={socialPlatformAlerts}
        sectionTitle="Recent Problems"
        eyebrow="Down & Maintenance"
      />
    </div>
  );
}
