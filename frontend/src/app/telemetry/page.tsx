import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import TelemetryStatusHub from "@/components/dashboard/TelemetryStatusHub";
import DashboardError from "@/components/dashboard/DashboardError";
import { buildPlatformsBySlug } from "@/lib/releases";
import { getUpcomingReleases } from "@/services/releasesService";
import { getServerStatuses } from "@/services/statusService";
import {
  getGameTelemetry,
  getTelemetryHistory,
  getTelemetryIncidents,
} from "@/services/telemetryService";
import type { TelemetryHistorySnapshot } from "@/types/telemetry";

export const metadata: Metadata = {
  title: "Server Live Status",
  description:
    "Full server status grid for all monitored games and social platforms.",
};

export const revalidate = 60;

async function loadTelemetryHistoryBySlug(
  gameSlugs: string[],
): Promise<Record<string, TelemetryHistorySnapshot[]>> {
  const entries = await Promise.all(
    gameSlugs.map(async (slug) => {
      const history = await getTelemetryHistory(slug).catch(() => []);
      return [slug, history] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export default async function TelemetryPage() {
  try {
    const [statuses, gameTelemetry, incidents, releases] = await Promise.all([
      getServerStatuses(),
      getGameTelemetry().catch(() => []),
      getTelemetryIncidents().catch(() => []),
      getUpcomingReleases().catch(() => []),
    ]);

    const platformsBySlug = buildPlatformsBySlug(releases);

    const telemetryHistoryBySlug = await loadTelemetryHistoryBySlug(
      gameTelemetry.map((entry) => entry.gameSlug),
    );

    return (
      <PageShell
        title="SERVER LIVE STATUS"
        subtitle="Every tracked game and social platform in one place. Status updates refresh automatically."
        badge="Servers"
      >
        <TelemetryStatusHub
          statuses={statuses}
          gameTelemetry={gameTelemetry}
          telemetryHistoryBySlug={telemetryHistoryBySlug}
          platformsBySlug={platformsBySlug}
          incidents={incidents}
        />
      </PageShell>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load server status data from the backend.";

    return <DashboardError message={message} />;
  }
}
