import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import DashboardError from "@/components/dashboard/DashboardError";
import { getGamingNews } from "@/services/newsService";

export const metadata: Metadata = {
  title: "AI Intelligence Feed",
  description:
    "Full RAG-powered gaming intelligence feed with patch summaries, incident briefs, and release intel.",
};

export const revalidate = 60;

export default async function IntelPage() {
  try {
    const news = await getGamingNews();

    return (
      <PageShell
        title="AI INTELLIGENCE FEED"
        subtitle="Ollama-processed patch notes, incident briefs, and release intel from the harvester pipeline."
        badge="RAG Engine"
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
