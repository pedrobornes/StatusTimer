import Link from "next/link";
import { ArrowRight, BrainCircuit, CalendarDays } from "lucide-react";
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

interface MonitorNewsPanelProps {
  news: GamingNews[];
}

export default function MonitorNewsPanel({ news }: MonitorNewsPanelProps) {
  return (
    <section className="glass-panel glow-ring rounded-3xl p-5 md:p-6">
      <SidebarPanelHeader
        icon={<BrainCircuit className="h-4 w-4 text-fuchsia-300" />}
        iconClassName="border-fuchsia-400/25 bg-fuchsia-500/10"
        eyebrow="Latest Alerts"
        title="Game News & Updates"
      />

      {news.length === 0 ? (
        <SidebarEmptyState message="No new alerts right now. Everything looks good!" />
      ) : (
        <div className="space-y-3">
          {news.map((article) => {
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

            return (
              <Link
                key={article.id}
                href={APP_ROUTES.newsArticle(article.slug)}
                className="block"
              >
                <article
                  className={`h-full rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition hover:bg-white/[0.06] ${accent.borderClass}`}
                >
                  <div className="mb-3 flex items-start gap-3">
                    <GameAssetImage
                      name={gameLabel}
                      src={coverSrc}
                      className="h-12 w-9 shrink-0"
                      imageClassName="object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        {accent.label ? (
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${accent.badgeClass}`}
                          >
                            {accent.label}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                          <CalendarDays className="h-3 w-3" />
                          <RelativeTime
                            value={article.publishedAt ?? article.createdAt}
                          />
                        </span>
                      </div>

                      <p className="truncate text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">
                        {gameLabel}
                      </p>
                    </div>
                  </div>

                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                    {displayTitle}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                    {buildNewsExcerpt(article.content)}
                  </p>
                </article>
              </Link>
            );
          })}
        </div>
      )}

      <Link
        href={APP_ROUTES.games}
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-fuchsia-200/75 transition hover:text-fuchsia-100"
      >
        Browse games
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </section>
  );
}
