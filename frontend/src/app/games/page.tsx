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
  title: "Game Server Live Status",
  description:
    "Browse gaming server status, player counts, and recent outages for tracked games in one place.",
};

export const revalidate = 120;

export default async function GamesPage() {
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
        title="Game server live status"
        subtitle="Gaming telemetry, player activity, and recent outages for every tracked game."
        badge="Games"
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
        : "Unable to load game status data from the backend.";

    return <DashboardError message={message} />;
  }
}
