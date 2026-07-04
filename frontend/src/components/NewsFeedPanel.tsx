import { CalendarDays, Newspaper, Sparkles } from "lucide-react";
import type { GamingNews } from "@/types/api";

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface NewsFeedPanelProps {
  news: GamingNews[];
  fillHeight?: boolean;
}

export default function NewsFeedPanel({
  news,
  fillHeight = false,
}: NewsFeedPanelProps) {
  const panelClass = fillHeight
    ? "glass-panel flex h-full min-h-0 flex-col rounded-3xl p-6 md:p-8"
    : "glass-panel rounded-3xl p-6 md:p-8";

  const contentClass = fillHeight
    ? "scrollbar-subtle min-h-0 flex-1 overflow-y-auto pr-1"
    : "";

  return (
    <section className={panelClass}>
      <div className="mb-6 flex shrink-0 items-center gap-3">
        <div className="rounded-2xl border border-fuchsia-400/25 bg-fuchsia-500/10 p-3">
          <Newspaper className="h-5 w-5 text-fuchsia-300" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-fuchsia-200/80">
            Live Feed
          </p>
          <h2 className="heading-section text-2xl uppercase text-white">
            NEWS & PATCH NOTES
          </h2>
        </div>
      </div>

      <div className={contentClass}>
        {news.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-fuchsia-400/20 px-4 py-10 text-center text-sm text-slate-400">
            [DECRYPTING] No new patches detected. Standby for updates...
          </p>
        ) : (
          <div className="space-y-4">
            {news.map((article) => (
              <article
                key={article.id}
                className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 transition hover:border-fuchsia-400/25 hover:bg-white/[0.06]"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-fuchsia-100">
                    <Sparkles className="h-3 w-3" />
                    {article.gameTag}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <time dateTime={article.createdAt}>
                      {formatTimestamp(article.createdAt)}
                    </time>
                  </span>
                </div>

                <h3 className="mb-3 text-lg font-bold leading-snug text-white">
                  {article.title}
                </h3>

                <p className="text-sm leading-7 text-slate-300">
                  {article.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
