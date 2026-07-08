import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import TelemetryStatusHub from "@/components/dashboard/TelemetryStatusHub";
import DashboardError from "@/components/dashboard/DashboardError";
import { buildPlatformsBySlug } from "@/lib/releases";
import { getCatalogGames } from "@/services/catalogService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getServerStatuses } from "@/services/statusService";
import { getTelemetryIncidents } from "@/services/telemetryService";

export const metadata: Metadata = {
  title: "Server Live Status",
  description:
    "Browse gaming server status, social platform connectivity, and recent outages in one place.",
};

export const revalidate = 120;

export default async function TelemetryPage() {
  try {
    const [statuses, catalogPage, incidents, releases] = await Promise.all([
      getServerStatuses(),
      getCatalogGames({ page: 0, size: 48 }).catch(() => ({
        items: [],
        page: 0,
        size: 48,
        totalElements: 0,
        totalPages: 0,
      })),
      getTelemetryIncidents().catch(() => []),
      getUpcomingReleases().catch(() => []),
    ]);

    const platformsBySlug = buildPlatformsBySlug(releases);

    return (
      <PageShell
        title="Server live status"
        subtitle="Gaming telemetry, social platform checks, and recent outages — organized in three sections below."
        badge="Servers"
      >
        <TelemetryStatusHub
          statuses={statuses}
          gameTelemetry={catalogPage.items}
          telemetryHistoryBySlug={{}}
          platformsBySlug={platformsBySlug}
          incidents={incidents}
          catalogTotal={catalogPage.totalElements}
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
