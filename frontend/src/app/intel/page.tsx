import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import NewsFeedPanel from "@/components/NewsFeedPanel";
import DashboardError from "@/components/DashboardError";
import { getGamingNews } from "@/services/newsService";

export const metadata: Metadata = {
  title: "News & Patch Notes",
  description:
    "Full gaming news feed with patch notes, updates, and industry headlines.",
};

export const revalidate = 60;

export default async function IntelPage() {
  try {
    const news = await getGamingNews();

    return (
      <PageShell
        title="NEWS & PATCH NOTES"
        subtitle="Latest headlines, balance changes, and patch logs from every tracked game."
        badge="News"
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
