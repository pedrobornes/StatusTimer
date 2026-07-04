import { Sparkles } from "lucide-react";
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
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-violet-100/90">
            <Sparkles className="h-3.5 w-3.5" />
            Monitor
          </div>
          <h1 className="heading-display text-4xl uppercase text-white md:text-5xl">
            BLACKWATCH MONITOR
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Live server status, game countdowns, and latest patch notes.
            Real-time sync active.
          </p>
        </header>

        <div className="grid gap-8 xl:grid-cols-[1.6fr_1fr] xl:items-stretch">
          <div className="space-y-8">
            <ServerStatusPanel statuses={statuses} />
            <UpcomingReleasesPanel releases={releases} />
          </div>
          <NewsFeedPanel news={news} fillHeight />
        </div>
      </div>
    </div>
  );
}
