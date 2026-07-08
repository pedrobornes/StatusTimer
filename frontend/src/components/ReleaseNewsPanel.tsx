import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import GameAssetImage from "@/components/ui/GameAssetImage";
import RelativeTime from "@/components/ui/RelativeTime";
import { APP_ROUTES } from "@/config/routes";
import {
  cleanNewsDisplayTitle,
  resolveNewsGameName,
} from "@/lib/intelFeed";
import { resolveCatalogImageUrl } from "@/lib/gameAssets";
import { resolveRecordDate } from "@/utils/dateFormatter";
import type { GamingNews } from "@/types/api";

interface ReleaseNewsPanelProps {
  news: GamingNews[];
  gameName: string;
  gameSlug: string;
}

function resolveNewsDateIso(article: GamingNews): string | null {
  const resolved = resolveRecordDate(article as unknown as Record<string, unknown>);
  return resolved ? resolved.toISOString() : null;
}

export default function ReleaseNewsPanel({
  news,
  gameName,
  gameSlug,
}: ReleaseNewsPanelProps) {
  return (
    <section className="glass-panel rounded-3xl p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-3">
            <FileText className="h-5 w-5 text-fuchsia-300" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300/70">
              Latest updates
            </p>
            <h2 className="heading-section text-2xl uppercase text-white">
              News & Patch Notes
            </h2>
          </div>
        </div>

        <Link
          href={APP_ROUTES.gameNews(gameSlug)}
          className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-fuchsia-200/80 transition hover:text-fuchsia-100"
        >
          All {gameName} news
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Link>
      </div>

      {news.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-fuchsia-400/20 px-4 py-10 text-center text-sm text-slate-400">
          No new patches detected for {gameName} yet. Check back soon for updates.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {news.map((article, index) => {
            const dateIso = resolveNewsDateIso(article);
            const isFeatured = index === 0;

            return (
              <Link
                key={article.id}
                href={APP_ROUTES.gameNewsArticle(gameSlug, article.slug)}
                className={isFeatured ? "lg:col-span-2" : undefined}
              >
                <article
                  className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] transition hover:border-fuchsia-400/25 hover:bg-white/[0.05] ${
                    isFeatured ? "md:flex-row" : ""
                  }`}
                >
                  <GameAssetImage
                    name={article.gameTag}
                    src={resolveCatalogImageUrl(
                      article.gameCoverUrl ?? null,
                      null,
                    )}
                    className={
                      isFeatured
                        ? "h-40 w-full shrink-0 md:h-auto md:w-44"
                        : "h-28 w-full shrink-0"
                    }
                    imageClassName="object-cover"
                  />

                  <div className="flex flex-1 flex-col p-4 md:p-5">
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
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
