import Dashboard from "@/components/Dashboard";
import DashboardError from "@/components/DashboardError";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getServerStatuses } from "@/services/statusService";
import { getGameTelemetry } from "@/services/telemetryService";

export const revalidate = 60;

export default async function HomePage() {
  try {
    const [statuses, gameTelemetry, news, releases] = await Promise.all([
      getServerStatuses(),
      getGameTelemetry().catch(() => []),
      getGamingNews(),
      getUpcomingReleases(),
    ]);

    return (
      <Dashboard
        statuses={statuses}
        gameTelemetry={gameTelemetry.slice(0, 4)}
        news={news.slice(0, 4)}
        releases={releases.slice(0, 4)}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load dashboard data from the backend.";

    return <DashboardError message={message} />;
  }
}
