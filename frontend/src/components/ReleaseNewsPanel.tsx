import Link from "next/link";

import { ArrowRight, FileText } from "lucide-react";

import RelativeTime from "@/components/ui/RelativeTime";

import { APP_ROUTES } from "@/config/routes";

import {

  cleanNewsDisplayTitle,

  resolveNewsGameName,

} from "@/lib/intelFeed";

import {

  GAME_NEWS_PREVIEW_LIMIT,

  sortNewsByRecency,

} from "@/lib/newsFeed";

import { resolveRecordDate } from "@/utils/dateFormatter";

import type { GamingNews } from "@/types/api";



interface ReleaseNewsPanelProps {

  news: GamingNews[];

  gameName: string;

  gameSlug: string;

  previewLimit?: number;

  newsIndexHref?: string;

}



function resolveNewsDateIso(article: GamingNews): string | null {

  const resolved = resolveRecordDate(article as unknown as Record<string, unknown>);

  return resolved ? resolved.toISOString() : null;

}



export default function ReleaseNewsPanel({

  news,

  gameName,

  gameSlug,

  previewLimit = GAME_NEWS_PREVIEW_LIMIT,

  newsIndexHref,

}: ReleaseNewsPanelProps) {

  const sortedNews = sortNewsByRecency(news);

  if (sortedNews.length === 0) {
    return null;
  }

  const visibleNews = sortedNews.slice(0, previewLimit);

  const allNewsHref = newsIndexHref ?? APP_ROUTES.gameNews(gameSlug);

  return (

    <section className="glass-panel rounded-3xl p-5 sm:p-6 md:p-8">

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-3">
            <FileText className="h-5 w-5 text-fuchsia-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300/70">
              Latest updates
            </p>
            <h2 className="heading-section text-xl uppercase text-white sm:text-2xl">
              News & Patch Notes
            </h2>
          </div>
        </div>

        <Link
          href={allNewsHref}
          className="inline-flex shrink-0 items-center gap-1 self-start text-[11px] font-medium uppercase tracking-[0.16em] text-fuchsia-200/80 transition hover:text-fuchsia-100"
        >
          All {gameName} news
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>



      <div className="grid gap-4 lg:grid-cols-2">

          {visibleNews.map((article, index) => {

            const dateIso = resolveNewsDateIso(article);

            const isFeatured = index === 0;



            return (

              <Link

                key={article.id}

                href={APP_ROUTES.newsArticle(article.slug)}

                className={isFeatured ? "lg:col-span-2" : undefined}

              >

                <article className="group flex h-full flex-col rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition hover:border-fuchsia-400/25 hover:bg-white/[0.05] md:p-5">

                  <div className="mb-2 flex items-center justify-between gap-3">

                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-fuchsia-200/70">

                      {resolveNewsGameName(article)}

                    </p>

                    {dateIso ? (

                      <RelativeTime

                        value={dateIso}

                        className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-slate-500"

                      />

                    ) : null}

                  </div>



                  <h3

                    className={`font-semibold text-white transition group-hover:text-fuchsia-100 ${

                      isFeatured ? "text-xl leading-snug" : "text-base leading-snug"

                    }`}

                  >

                    {cleanNewsDisplayTitle(article.title, article.gameTag)}

                  </h3>



                  <p

                    className={`mt-2 flex-1 text-sm leading-6 text-slate-400 ${

                      isFeatured ? "line-clamp-3" : "line-clamp-2"

                    }`}

                  >

                    {article.content}

                  </p>



                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-fuchsia-200/80 transition group-hover:text-fuchsia-100">

                    Read article

                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />

                  </span>

                </article>

              </Link>

            );

          })}

      </div>

      {sortedNews.length > visibleNews.length ? (
        <div className="mt-5 border-t border-white/8 pt-5">
          <Link
            href={allNewsHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/10 px-4 py-3 text-xs font-medium uppercase tracking-[0.14em] text-fuchsia-100 transition hover:border-fuchsia-400/35 hover:bg-fuchsia-500/15 sm:w-auto"
          >
            View all {sortedNews.length} articles
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}
    </section>

  );

}

