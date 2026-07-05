import Link from "next/link";
import { ArrowRight } from "lucide-react";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import TelemetryGrid from "@/components/dashboard/TelemetryGrid";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import UpcomingReleasesPanel from "@/components/dashboard/UpcomingReleasesPanel";
import GameSearchBar from "@/components/ui/GameSearchBar";
import StatusTimerSonarLogo from "@/components/ui/StatusTimerSonarLogo";
import { APP_ROUTES } from "@/config/routes";
import type { GamingNews, UpcomingRelease } from "@/types/api";
import type { GameTelemetry, TelemetryHistorySnapshot, TelemetryIncident } from "@/types/telemetry";

interface DashboardProps {
  gameTelemetry: GameTelemetry[];
  historyBySlug: Record<string, TelemetryHistorySnapshot[]>;
  news: GamingNews[];
  releases: UpcomingRelease[];
  incidents: TelemetryIncident[];
}

export default function Dashboard({
  gameTelemetry,
  historyBySlug,
  news,
  releases,
  incidents,
}: DashboardProps) {
  return (
    <div className="mystery-grid min-h-screen">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10">
          <div className="mb-4 flex items-center gap-4 md:gap-5">
            <StatusTimerSonarLogo className="h-14 w-14 shrink-0 md:h-16 md:w-16" />
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-violet-100/90">
                Live Monitor
              </p>
              <h1 className="heading-display text-4xl uppercase text-white md:text-5xl">
                STATUSTIMER MONITOR
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            Check the live server status, regional ping, and official crash
            reports for your favorite games instantly.
          </p>

          <div className="mt-6">
            <GameSearchBar />
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] xl:items-start">
          <div className="min-w-0 space-y-8">
            <TelemetryGrid
              gameTelemetry={gameTelemetry}
              historyBySlug={historyBySlug}
              headerAction={
                <Link
                  href={APP_ROUTES.telemetry}
                  className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-violet-200/75 transition hover:text-violet-100"
                >
                  View more
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              }
            />
            <UpcomingReleasesPanel releases={releases} />
          </div>

          <aside className="min-w-0 space-y-6">
            <IncidentLog incidents={incidents} sidebar />
            <NewsFeedPanel
              news={news}
              sidebar
              emptyMessage="All servers are up and running. Time to game!"
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
