import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import DashboardError from "@/components/dashboard/DashboardError";
import { getGamingNews } from "@/services/newsService";

export const metadata: Metadata = {
  title: "Gaming News Feed",
  description:
    "Latest game updates, patch summaries, service incidents, and release highlights.",
};

export const revalidate = 60;

export default async function IntelPage() {
  try {
    const news = await getGamingNews();

    return (
      <PageShell
        title="GAME NEWS FEED"
        subtitle="Patch updates, service alerts, and release highlights in one place."
        badge="Live updates"
      >
        <NewsFeedPanel news={news} />
      </PageShell>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load news feed from the backend.";

    return <DashboardError message={message} />;
  }
}
