import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TelemetryGrid from "@/components/dashboard/TelemetryGrid";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import MonitorNewsPanel from "@/components/dashboard/MonitorNewsPanel";
import MonitorSocialPanel from "@/components/dashboard/MonitorSocialPanel";
import UpcomingReleasesPanel from "@/components/dashboard/UpcomingReleasesPanel";
import GameSearchBar from "@/components/ui/GameSearchBar";
import StatusTimerSonarLogo from "@/components/ui/StatusTimerSonarLogo";
import { APP_ROUTES } from "@/config/routes";
import { HOME_HERO_SUBTITLE } from "@/config/seo";
import type { GamingNews, ServerStatus, UpcomingRelease } from "@/types/api";
import type { GameTelemetry, TelemetryHistorySnapshot, TelemetryIncident } from "@/types/telemetry";

interface DashboardProps {
  gameTelemetry: GameTelemetry[];
  historyBySlug: Record<string, TelemetryHistorySnapshot[]>;
  releases: UpcomingRelease[];
  unreleasedSlugs?: string[];
  incidents: TelemetryIncident[];
  statuses: ServerStatus[];
  news: GamingNews[];
}

export default function Dashboard({
  gameTelemetry,
  historyBySlug,
  releases,
  unreleasedSlugs = [],
  incidents,
  statuses,
  news,
}: DashboardProps) {
  const upcomingReleaseSlugs = unreleasedSlugs.length > 0
    ? unreleasedSlugs
    : releases.map((release) => release.slug);
  const socialPlatformAlerts = statuses.filter(
    (status) => status.category === "SOCIAL" && status.isUp === false,
  );

  return (
    <div className="mystery-grid min-h-screen">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-8 md:px-8 md:py-12">
        <header className="mb-10">
          <div className="mb-4 flex items-center gap-4 md:gap-5">
            <StatusTimerSonarLogo className="h-14 w-14 shrink-0 md:h-16 md:w-16" />
            <div>
              <h1 className="heading-display text-4xl text-white md:text-5xl">
                Gaming status hub
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
            {HOME_HERO_SUBTITLE}
          </p>

          <div className="mt-6">
            <GameSearchBar initialUpcomingSlugs={upcomingReleaseSlugs} />
          </div>
        </header>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] xl:items-start">
          <div className="min-w-0 space-y-8">
            <TelemetryGrid
              gameTelemetry={gameTelemetry}
              historyBySlug={historyBySlug}
              headerAction={
                <Link
                  href={APP_ROUTES.games}
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
            <IncidentLog
              incidents={incidents}
              platformAlerts={socialPlatformAlerts}
              excludedGameSlugs={upcomingReleaseSlugs}
              sidebar
            />
            <MonitorNewsPanel news={news} />
            <MonitorSocialPanel statuses={statuses} />
          </aside>
        </div>
      </div>
    </div>
  );
}
