import Link from "next/link";
import { Sparkles } from "lucide-react";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import TelemetryGrid from "@/components/dashboard/TelemetryGrid";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import UpcomingReleasesPanel from "@/components/dashboard/UpcomingReleasesPanel";
import GameSearchBar from "@/components/ui/GameSearchBar";
import { buildSearchableGames } from "@/lib/gameAssets";
import { APP_ROUTES, TRACKED_GAME_SLUGS } from "@/config/routes";
import type { GamingNews, UpcomingRelease } from "@/types/api";
import type { GameTelemetry, TelemetryHistorySnapshot, TelemetryIncident } from "@/types/telemetry";

interface DashboardProps {
  telemetryBySlug: Record<string, GameTelemetry>;
  historyBySlug: Record<string, TelemetryHistorySnapshot[]>;
  news: GamingNews[];
  releases: UpcomingRelease[];
  incidents: TelemetryIncident[];
}

export default function Dashboard({
  telemetryBySlug,
  historyBySlug,
  news,
  releases,
  incidents,
}: DashboardProps) {
  const searchableGames = buildSearchableGames(
    TRACKED_GAME_SLUGS,
    telemetryBySlug,
  );

  return (
    <div className="mystery-grid min-h-screen">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-violet-100/90">
            <Sparkles className="h-3.5 w-3.5" />
            Live Monitor
          </div>
          <h1 className="heading-display text-4xl uppercase text-white md:text-5xl">
            BLACKWATCH MONITOR
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Check the live server status, regional ping, and official crash
            reports for your favorite games instantly.
          </p>

          <div className="mt-6">
            <GameSearchBar games={searchableGames} />
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,2.25fr)_minmax(0,0.85fr)] xl:items-start">
          <div className="min-w-0 space-y-8">
            <TelemetryGrid
              telemetryBySlug={telemetryBySlug}
              historyBySlug={historyBySlug}
              headerAction={
                <Link
                  href={APP_ROUTES.telemetry}
                  className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-100 transition hover:border-violet-400/40 hover:bg-violet-500/15"
                >
                  Open full server grid →
                </Link>
              }
            />
            <UpcomingReleasesPanel releases={releases} />
          </div>

          <aside className="min-w-0 space-y-8">
            <IncidentLog incidents={incidents} />
            <NewsFeedPanel
              news={news}
              sectionTitle="LIVE GAME ALERTS"
              eyebrow="Status Feed & Alerts"
              description="Quick summaries of recent game crashes, server maintenance, and developer updates."
              emptyMessage="All servers are up and running. Time to game!"
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
