import Dashboard from "@/components/Dashboard";
import DashboardError from "@/components/DashboardError";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getServerStatuses } from "@/services/statusService";

export const revalidate = 60;

export default async function HomePage() {
  try {
    const [statuses, news, releases] = await Promise.all([
      getServerStatuses(),
      getGamingNews(),
      getUpcomingReleases(),
    ]);

    return (
      <Dashboard statuses={statuses} news={news} releases={releases} />
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load dashboard data from the backend.";

    return <DashboardError message={message} />;
  }
}
