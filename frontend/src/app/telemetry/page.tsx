import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ServerStatusPanel from "@/components/ServerStatusPanel";
import DashboardError from "@/components/DashboardError";
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
    "Full server status grid for all monitored gaming, social, and streaming platforms.",
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
    const [statuses, gameTelemetry, incidents] = await Promise.all([
      getServerStatuses(),
      getGameTelemetry().catch(() => []),
      getTelemetryIncidents().catch(() => []),
    ]);

    const telemetryHistoryBySlug = await loadTelemetryHistoryBySlug(
      gameTelemetry.map((entry) => entry.gameSlug),
    );

    return (
      <PageShell
        title="SERVER LIVE STATUS"
        subtitle="Every tracked platform in one view. Status signals refresh on each sync cycle."
        badge="Servers"
      >
        <ServerStatusPanel
          statuses={statuses}
          gameTelemetry={gameTelemetry}
          telemetryHistoryBySlug={telemetryHistoryBySlug}
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
