import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import ReleasesHub from "@/components/ReleasesHub";
import DashboardError from "@/components/dashboard/DashboardError";
import { getUpcomingReleases } from "@/services/releasesService";

export const metadata: Metadata = {
  title: "Upcoming Releases",
  description:
    "Full game countdown grid with release dates, hype counters, and genre filters.",
};

export const revalidate = 60;

export default async function ReleasesPage() {
  try {
    const releases = await getUpcomingReleases();

    return (
      <PageShell
        title="GAME COUNTDOWNS"
        subtitle="Every tracked launch window, sorted by release date. Filter by genre once backend tags go live."
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
