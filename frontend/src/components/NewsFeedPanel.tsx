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
}

export default function NewsFeedPanel({ news }: NewsFeedPanelProps) {
  return (
    <section className="glass-panel rounded-3xl p-6 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-3">
          <Newspaper className="h-5 w-5 text-fuchsia-300" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300/70">
            AI Feed
          </p>
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-white">
            Gaming News
          </h2>
        </div>
      </div>

      {news.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-fuchsia-400/15 px-4 py-10 text-center text-sm text-violet-200/50">
          No articles published yet. Run the Python news writer to populate this
          feed.
        </p>
      ) : (
        <div className="space-y-4">
          {news.map((article) => (
            <article
              key={article.id}
              className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:border-fuchsia-400/20 hover:bg-white/[0.05]"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-200">
                  <Sparkles className="h-3 w-3" />
                  {article.gameTag}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-violet-200/55">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <time dateTime={article.createdAt}>
                    {formatTimestamp(article.createdAt)}
                  </time>
                </span>
              </div>

              <h3 className="mb-3 text-lg font-semibold leading-snug text-white">
                {article.title}
              </h3>

              <p className="text-sm leading-7 text-violet-100/75">
                {article.content}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
