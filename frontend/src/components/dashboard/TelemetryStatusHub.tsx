"use client";

import TelemetryGamesPanel from "@/components/dashboard/TelemetryGamesPanel";
import type { PlatformDetail } from "@/types/api";
import type { GameTelemetry } from "@/types/telemetry";

interface TelemetryStatusHubProps {
  initialCatalogPage: {
    items: GameTelemetry[];
    page: number;
    totalPages: number;
    totalElements: number;
  };
  platformsBySlug: Record<string, PlatformDetail[]>;
}

export default function TelemetryStatusHub({
  initialCatalogPage,
  platformsBySlug,
}: TelemetryStatusHubProps) {
  return (
    <TelemetryGamesPanel
      initialGameTelemetry={initialCatalogPage.items}
      initialPage={initialCatalogPage.page}
      initialTotalPages={initialCatalogPage.totalPages}
      initialTotalElements={initialCatalogPage.totalElements}
      platformsBySlug={platformsBySlug}
    />
  );
}
