import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ReleasesHub from "@/components/ReleasesHub";
import DashboardError from "@/components/dashboard/DashboardError";
import { buildReleasesHubMetadata } from "@/lib/seo/releaseMetadata";
import { getUpcomingReleases } from "@/services/releasesService";

export const metadata: Metadata = buildReleasesHubMetadata();

export const revalidate = 60;

export default async function ReleasesPage() {
  try {
    const releases = await getUpcomingReleases();

    return (
      <PageShell
        title="GAME COUNTDOWNS"
        subtitle="Upcoming launches with hype counters, release windows, and genre filters."
        badge="Releases"
      >
        <div className="glass-panel rounded-3xl p-6 md:p-8">
          <ReleasesHub releases={releases} />
        </div>
      </PageShell>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load releases from the backend.";

    return <DashboardError message={message} />;
  }
}
