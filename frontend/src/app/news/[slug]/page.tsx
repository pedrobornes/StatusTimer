import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/PageShell";
import IntelFeedContent from "@/components/dashboard/IntelFeedContent";
import DashboardError from "@/components/dashboard/DashboardError";
import { getGamingNewsBySlug } from "@/services/newsService";
import type { GamingNews } from "@/types/api";
import { formatLocalizedTimestamp } from "@/utils/dateFormatter";
import { resolveCatalogImageUrl } from "@/lib/gameAssets";

export const revalidate = 60;

interface NewsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: NewsPageProps,
): Promise<Metadata> {
  const { slug } = await params;

  try {
    const news = await getGamingNewsBySlug(slug);

    return {
      title: `${news.title} | StatusTimer`,
      description: `${news.gameTag} · News & patch updates`,
    };
  } catch {
    return { title: "News | StatusTimer" };
  }
}

function resolveNewsTime(article: GamingNews): string {
  return formatLocalizedTimestamp(article.publishedAt ?? article.createdAt);
}

export default async function NewsPage({ params }: NewsPageProps) {
  const { slug } = await params;

  try {
    const article = await getGamingNewsBySlug(slug);

    if (!article) {
      notFound();
    }

    const coverUrl = resolveCatalogImageUrl(
      article.gameCoverUrl ?? null,
      null,
    );

    return (
      <PageShell
        badge="News & Patch Notes"
        title={article.title}
        subtitle={article.gameTag}
        coverUrl={coverUrl}
        coverAlt={article.gameTag}
      >
        <section className="glass-panel mb-6 rounded-3xl p-6 md:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-slate-200">
              {article.gameTag}
            </span>
            <span className="text-xs text-slate-400">
              Published: {resolveNewsTime(article)}
            </span>
          </div>

          <IntelFeedContent content={article.content} />
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          <a href="/intel" className="transition hover:text-violet-200/70">
            View all news
          </a>
        </p>
      </PageShell>
    );
  } catch (error) {
    return (
      <DashboardError
        message={
          error instanceof Error
            ? error.message
            : "Unable to load this news item from the backend."
        }
      />
    );
  }
}

