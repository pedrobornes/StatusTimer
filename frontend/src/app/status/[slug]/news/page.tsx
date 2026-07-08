import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CalendarDays } from "lucide-react";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import PageShell from "@/components/PageShell";
import GameAssetImage from "@/components/ui/GameAssetImage";
import { APP_ROUTES } from "@/config/routes";
import { resolveGameDisplayName } from "@/lib/gameAssets";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import {
  classifyIntelArticle,
  cleanNewsDisplayTitle,
  getIntelArticleAccent,
  resolveNewsGameName,
} from "@/lib/intelFeed";
import { resolveCatalogImageUrl } from "@/lib/gameAssets";
import { hasGameMedia, resolveGameMedia } from "@/lib/gameMedia";
import { getGamingNewsByGame } from "@/services/newsService";
import { getGameStatusDetail } from "@/services/telemetryService";
import { formatRelativeTime } from "@/utils/dateFormatter";

export const revalidate = 60;

interface GameNewsIndexPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: GameNewsIndexPageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  return {
    title: `${resolveGameDisplayName(canonicalSlug)} News & Patch Notes | StatusTimer`,
    description: `Latest news, updates, and patch notes.`,
  };
}

export default async function GameNewsIndexPage({
  params,
}: GameNewsIndexPageProps) {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  if (canonicalSlug !== slug) {
    redirect(APP_ROUTES.gameNews(canonicalSlug));
  }

  const [news, detail] = await Promise.all([
    getGamingNewsByGame(canonicalSlug).catch(() => null),
    getGameStatusDetail(canonicalSlug).catch(() => null),
  ]);

  if (!news || news.length === 0) {
    notFound();
  }

  const gameName = resolveNewsGameName(news[0]);
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
      badge="Game News"
      title={`${gameName} News`}
      subtitle={`Patch notes, updates, and developer announcements for ${gameName}.`}
    >
      <GameStatusSubNav slug={canonicalSlug} hasNews hasMedia={hasMedia} />
      <div className="space-y-4">
        {news.map((article) => {
          const accent = getIntelArticleAccent(classifyIntelArticle(article.title));
          const displayTitle = cleanNewsDisplayTitle(
            article.title,
            article.gameTag,
          );
          const coverSrc = resolveCatalogImageUrl(
            article.gameCoverUrl ?? null,
            null,
          );

          return (
            <Link
              key={article.id}
              href={APP_ROUTES.gameNewsArticle(canonicalSlug, article.slug)}
              className="block"
            >
              <article
                className={`rounded-2xl border border-white/8 bg-white/[0.04] p-5 transition hover:border-violet-400/25 hover:bg-white/[0.06] ${accent.borderClass}`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <GameAssetImage
                    name={gameName}
                    src={coverSrc}
                    className="h-16 w-12 shrink-0"
                    imageClassName="object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badgeClass}`}
                      >
                        {accent.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        <time
                          dateTime={article.publishedAt ?? article.createdAt}
                        >
                          {formatRelativeTime(
                            article.publishedAt ?? article.createdAt,
                          )}
                        </time>
                      </span>
                    </div>

                    <h2 className="text-lg font-bold leading-snug text-white">
                      {displayTitle}
                    </h2>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                      {article.content.replace(/\s+/g, " ").slice(0, 180)}
                      {article.content.length > 180 ? "…" : ""}
                    </p>

                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-200/80">
                      Read article
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        <Link
          href={APP_ROUTES.status(canonicalSlug)}
          className="transition hover:text-violet-200/70"
        >
          Back to {gameName} server status
        </Link>
      </p>
    </PageShell>
  );
}
