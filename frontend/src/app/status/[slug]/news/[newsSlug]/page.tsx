import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import IntelFeedContent from "@/components/dashboard/IntelFeedContent";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import {
  cleanNewsDisplayTitle,
  resolveNewsGameName,
} from "@/lib/intelFeed";
import { loadStatusPageHeroUrl } from "@/lib/statusHero";
import { hasGameMedia, resolveGameMedia } from "@/lib/gameMedia";
import { getGamingNewsBySlug } from "@/services/newsService";
import { getGameStatusDetail } from "@/services/telemetryService";
import { formatLocalizedTimestamp } from "@/utils/dateFormatter";

export const revalidate = 60;

interface GameNewsArticlePageProps {
  params: Promise<{ slug: string; newsSlug: string }>;
}

function resolveNewsTime(publishedAt?: string, createdAt?: string): string {
  return formatLocalizedTimestamp(publishedAt ?? createdAt ?? "");
}

export async function generateMetadata({
  params,
}: GameNewsArticlePageProps): Promise<Metadata> {
  const { slug, newsSlug } = await params;

  try {
    const article = await getGamingNewsBySlug(newsSlug);
    const gameName = resolveNewsGameName(article);
    const displayTitle = cleanNewsDisplayTitle(article.title, article.gameTag);

    return {
      title: `${displayTitle} | ${gameName} News`,
      description: `${gameName} patch notes and developer updates on StatusTimer.`,
    };
  } catch {
    return { title: `News | ${slug}` };
  }
}

export default async function GameNewsArticlePage({
  params,
}: GameNewsArticlePageProps) {
  const { slug, newsSlug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  if (canonicalSlug !== slug) {
    redirect(APP_ROUTES.gameNewsArticle(canonicalSlug, newsSlug));
  }

  try {
    const article = await getGamingNewsBySlug(newsSlug);

    if (!article) {
      notFound();
    }

    const articleGameSlug = resolveCanonicalGameSlug(article.gameTag);
    if (articleGameSlug !== canonicalSlug) {
      redirect(APP_ROUTES.gameNewsArticle(articleGameSlug, article.slug));
    }

    const gameName = resolveNewsGameName(article);
    const displayTitle = cleanNewsDisplayTitle(article.title, article.gameTag);
    const coverUrl = await loadStatusPageHeroUrl(canonicalSlug);
    const detail = await getGameStatusDetail(canonicalSlug).catch(() => null);
    const hasMedia = detail
      ? hasGameMedia(
          resolveGameMedia(
            {
              screenshotUrls: detail.screenshotUrls,
              trailerVideoIds: detail.trailerVideoIds,
              youtubeChannelUrl: detail.youtubeChannelUrl,
            },
            detail.telemetry,
          ),
        )
      : false;

    return (
      <PageShell
        badge="News & Patch Notes"
        title={displayTitle}
        subtitle={gameName}
        coverUrl={coverUrl}
        coverAlt={gameName}
      >
        <GameStatusSubNav slug={canonicalSlug} hasNews hasMedia={hasMedia} />
        <section className="glass-panel mb-6 rounded-3xl p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link
              href={APP_ROUTES.status(canonicalSlug)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-violet-400/30 hover:text-white"
            >
              {gameName}
            </Link>
            <span className="text-xs text-slate-400">
              Published: {resolveNewsTime(article.publishedAt, article.createdAt)}
            </span>
          </div>

          <IntelFeedContent content={article.content} />
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          <Link
            href={APP_ROUTES.gameNews(canonicalSlug)}
            className="transition hover:text-violet-200/70"
          >
            View all {gameName} news
          </Link>
        </p>
      </PageShell>
    );
  } catch {
    notFound();
  }
}
