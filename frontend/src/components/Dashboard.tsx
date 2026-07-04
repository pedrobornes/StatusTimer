import { Eye, Sparkles } from "lucide-react";
import NewsFeedPanel from "@/components/NewsFeedPanel";
import ServerStatusPanel from "@/components/ServerStatusPanel";
import UpcomingReleasesPanel from "@/components/UpcomingReleasesPanel";
import type { GamingNews, ServerStatus, UpcomingRelease } from "@/types/api";

interface DashboardProps {
  statuses: ServerStatus[];
  news: GamingNews[];
  releases: UpcomingRelease[];
}

export default function Dashboard({ statuses, news, releases }: DashboardProps) {
  return (
    <div className="mystery-grid min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-violet-200/80">
              <Sparkles className="h-3.5 w-3.5" />
              StatusTimer
            </div>
            <h1 className="font-[family-name:var(--font-cinzel)] text-4xl tracking-[0.08em] text-white md:text-5xl">
              Mystery Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-violet-200/65 md:text-base">
              Live platform health signals and AI-generated gaming updates,
              synchronized from your Spring Boot backend.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-violet-200/70">
            <Eye className="h-4 w-4 text-violet-300" />
            Real-time data view
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-8">
            <ServerStatusPanel statuses={statuses} />
            <UpcomingReleasesPanel releases={releases} />
          </div>
          <NewsFeedPanel news={news} />
        </div>
      </div>
    </div>
  );
}
