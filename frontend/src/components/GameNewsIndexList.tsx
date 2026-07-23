import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import GameNewsPagination from "@/components/GameNewsPagination";
import RelativeTime from "@/components/ui/RelativeTime";
import { APP_ROUTES } from "@/config/routes";
import { buildNewsExcerpt, cleanNewsDisplayTitle } from "@/lib/intelFeed";
import { paginateNews } from "@/lib/newsFeed";
import type { GamingNews } from "@/types/api";

interface GameNewsIndexListProps {
  news: GamingNews[];
  currentPage: number;
}

export default function GameNewsIndexList({
  news,
  currentPage,
}: GameNewsIndexListProps) {
  const { items, totalPages, currentPage: safePage } = paginateNews(
    news,
    currentPage,
  );

  return (
    <>
      <div className="space-y-4">
        {items.map((article) => {
          const displayTitle = cleanNewsDisplayTitle(
            article.title,
            article.gameTag,
          );

          return (
            <Link
              key={article.id}
              href={APP_ROUTES.newsArticle(article.slug)}
              className="block"
            >
              <article className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 transition hover:border-violet-400/25 hover:bg-white/[0.06]">
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    <RelativeTime
                      value={article.publishedAt ?? article.createdAt}
                    />
                  </span>
                </div>

                <h2 className="text-lg font-bold leading-snug text-white">
                  {displayTitle}
                </h2>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">
                  {buildNewsExcerpt(article.content)}
                </p>

                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-violet-200/80">
                  Read article
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </article>
            </Link>
          );
        })}
      </div>

      <GameNewsPagination currentPage={safePage} totalPages={totalPages} />
    </>
  );
}
