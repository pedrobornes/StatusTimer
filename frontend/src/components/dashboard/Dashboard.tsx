import Link from "next/link";
import { Sparkles } from "lucide-react";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import TelemetryGrid from "@/components/dashboard/TelemetryGrid";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import UpcomingReleasesPanel from "@/components/dashboard/UpcomingReleasesPanel";
import { APP_ROUTES } from "@/config/routes";
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
  return (
    <div className="mystery-grid min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.35em] text-violet-100/90">
              <Sparkles className="h-3.5 w-3.5" />
              Live Monitor
            </div>
            <h1 className="heading-display text-4xl uppercase text-white md:text-5xl">
              BLACKWATCH MONITOR
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Six tracked titles with live telemetry, incident alerts, and
              Ollama-processed patch intelligence in one viewport.
            </p>
          </div>

          <Link
            href={APP_ROUTES.telemetry}
            className="inline-flex items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-100 transition hover:border-violet-400/40 hover:bg-violet-500/15"
          >
            Open full server grid →
          </Link>
        </header>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] xl:items-start">
          <div className="space-y-8">
            <TelemetryGrid
              telemetryBySlug={telemetryBySlug}
              historyBySlug={historyBySlug}
            />
            <IncidentLog incidents={incidents} />
            <UpcomingReleasesPanel releases={releases} />
          </div>

          <NewsFeedPanel news={news} fillHeight />
        </div>
      </div>
    </div>
  );
}
