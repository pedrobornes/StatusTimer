import Link from "next/link";
import { ArrowRight, BrainCircuit, CalendarDays } from "lucide-react";
import IntelFeedContent from "@/components/dashboard/IntelFeedContent";
import SidebarPanelHeader, {
  SidebarEmptyState,
} from "@/components/dashboard/SidebarPanelHeader";
import GameAssetImage from "@/components/ui/GameAssetImage";
import RelativeTime from "@/components/ui/RelativeTime";
import { APP_ROUTES } from "@/config/routes";
import {
  buildNewsExcerpt,
  cleanNewsDisplayTitle,
  getDashboardNewsAccent,
  resolveNewsGameName,
} from "@/lib/intelFeed";
import { resolveCatalogImageUrl } from "@/lib/gameAssets";
import type { GamingNews } from "@/types/api";

interface NewsFeedPanelProps {
  news: GamingNews[];
  fillHeight?: boolean;
  compact?: boolean;
  sidebar?: boolean;
  sectionTitle?: string;
  eyebrow?: string;
  description?: string;
  emptyMessage?: string;
  /** When set, article and "view more" links stay scoped to this game. */
  gameSlug?: string;
  viewMoreHref?: string;
}

export default function NewsFeedPanel({
  news,
  fillHeight = false,
  compact = false,
  sidebar = false,
  sectionTitle = sidebar ? "Live Alerts" : "Game News & Updates",
  eyebrow = sidebar ? "Status Feed" : "Latest Alerts",
  description = "Quick summaries of recent game crashes, server maintenance, and developer updates.",
  emptyMessage = "No new alerts right now. Everything looks good!",
  gameSlug,
  viewMoreHref,
}: NewsFeedPanelProps) {
  const resolvedViewMoreHref = viewMoreHref ?? (gameSlug ? APP_ROUTES.gameNews(gameSlug) : null);
  const showViewMore = Boolean(resolvedViewMoreHref);

  const resolveArticleHref = (article: GamingNews) => {
    return APP_ROUTES.newsArticle(article.slug);
  };
  const panelClass = fillHeight
    ? "glass-panel flex min-h-0 flex-col self-start rounded-3xl p-6 md:p-8 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)]"
    : sidebar
      ? "glass-panel glow-ring rounded-3xl p-5 md:p-6"
      : "glass-panel rounded-3xl p-6 md:p-8";

  const contentClass = fillHeight
    ? "scrollbar-subtle min-h-0 flex-1 overflow-y-auto pr-1"
    : "";

  const showDescription = !sidebar && !compact;
  const visibleNews = sidebar
    ? news.slice(0, 3)
    : fillHeight
      ? news.slice(0, 6)
      : news;
  const hasHiddenNews = visibleNews.length < news.length;
  const isGameScoped = Boolean(gameSlug);

  return (
    <section className={panelClass}>
      {sidebar ? (
        <SidebarPanelHeader
          icon={<BrainCircuit className="h-4 w-4 text-fuchsia-300" />}
          iconClassName="border-fuchsia-400/25 bg-fuchsia-500/10"
          eyebrow={eyebrow}
          title={sectionTitle}
          action={
            showViewMore ? (
              <Link
                href={resolvedViewMoreHref!}
                className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.12em] text-fuchsia-200/75 transition hover:text-fuchsia-100"
              >
                View more
                <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="mb-6 flex shrink-0 items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 p-3">
              <BrainCircuit className="h-5 w-5 text-fuchsia-300" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.35em] text-fuchsia-200/80">
                {eyebrow}
              </p>
              <h2 className="heading-section text-2xl uppercase text-white">
                {sectionTitle}
              </h2>
            </div>
          </div>
          {!compact && showViewMore ? (
            <Link
              href={resolvedViewMoreHref!}
              className="text-[10px] font-medium uppercase tracking-[0.16em] text-fuchsia-200/80 transition hover:text-fuchsia-100"
            >
              Full feed →
            </Link>
          ) : null}
        </div>
      )}

      {showDescription ? (
        <p className="mb-5 shrink-0 text-sm text-zinc-400">{description}</p>
      ) : null}

      <div className={contentClass}>
        {visibleNews.length === 0 ? (
          sidebar ? (
            <SidebarEmptyState message={emptyMessage} />
          ) : (
            <p className="rounded-2xl border border-dashed border-fuchsia-400/20 px-4 py-10 text-center text-sm text-slate-400">
              {emptyMessage}
            </p>
          )
        ) : (
          <div className={sidebar ? "space-y-3" : "space-y-4"}>
            {visibleNews.map((article) => {
              const accent = getDashboardNewsAccent(article.title);
              const displayTitle = cleanNewsDisplayTitle(
                article.title,
                article.gameTag,
              );
              const gameLabel = resolveNewsGameName(article);
              const coverSrc = resolveCatalogImageUrl(
                article.gameCoverUrl ?? null,
                null,
              );

              if (sidebar) {
                return (
                    <Link
                      key={article.id}
                      href={resolveArticleHref(article)}
                      className="block"
                    >
                      <article
                        className={`rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition hover:bg-white/[0.06] ${accent.borderClass}`}
                      >
                        <div className="mb-3 flex items-start gap-3">
                          <GameAssetImage
                            name={gameLabel}
                            src={coverSrc}
                            className="h-10 w-8"
                            imageClassName="object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {accent.label ? (
                                <span
                                  className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${accent.badgeClass}`}
                                >
                                  {accent.label}
                                </span>
                              ) : null}
                              <RelativeTime
                                value={article.publishedAt ?? article.createdAt}
                                className="text-[10px] text-slate-500"
                              />
                            </div>

                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                              {displayTitle}
                            </h3>
                          </div>
                        </div>
                      </article>
                    </Link>
                );
              }

                return (
                  <Link
                    key={article.id}
                    href={resolveArticleHref(article)}
                    className="block"
                  >
                    <article
                      className={`rounded-2xl border border-white/8 bg-white/[0.04] p-5 transition hover:bg-white/[0.06] ${accent.borderClass}`}
                    >
                      {isGameScoped ? (
                        <>
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            {accent.label ? (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badgeClass}`}
                              >
                                {accent.label}
                              </span>
                            ) : null}
                            <RelativeTime
                              value={article.publishedAt ?? article.createdAt}
                              className="inline-flex items-center gap-1 text-xs text-slate-400"
                            />
                          </div>

                          <h3 className="text-lg font-bold leading-snug text-white">
                            {displayTitle}
                          </h3>

                          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                            {buildNewsExcerpt(article.content)}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="mb-4 flex flex-wrap items-start gap-4">
                            <div className="flex w-20 shrink-0 items-center justify-center">
                              <GameAssetImage
                                name={gameLabel}
                                src={coverSrc}
                                className="h-16 w-16"
                                imageClassName="object-cover"
                              />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                {accent.label ? (
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${accent.badgeClass}`}
                                  >
                                    {accent.label}
                                  </span>
                                ) : null}
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-300">
                                  {gameLabel}
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  <RelativeTime
                                    value={article.publishedAt ?? article.createdAt}
                                  />
                                </span>
                              </div>

                              <h3 className="mb-3 text-base font-bold leading-snug text-white">
                                {displayTitle}
                              </h3>
                            </div>
                          </div>

                          <IntelFeedContent content={article.content} />
                        </>
                      )}
                    </article>
                  </Link>
                );
            })}
          </div>
        )}
      </div>

      {hasHiddenNews && showViewMore ? (
        <Link
          href={resolvedViewMoreHref!}
          className="mt-5 inline-flex shrink-0 items-center justify-center gap-1 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-4 py-2 text-xs font-medium text-fuchsia-100 transition hover:bg-fuchsia-500/20"
        >
          View all news
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
