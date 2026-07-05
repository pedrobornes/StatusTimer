import { AlertTriangle } from "lucide-react";
import SidebarPanelHeader, {
  SidebarEmptyState,
} from "@/components/dashboard/SidebarPanelHeader";
import {
  formatIncidentMessage,
  formatTelemetryTimestamp,
  getIncidentAccentClass,
  getTimelineBlockClass,
  resolveIncidentDateIso,
} from "@/lib/telemetry";
import type { TelemetryIncident } from "@/types/telemetry";

interface IncidentLogProps {
  incidents: TelemetryIncident[];
  embedded?: boolean;
  sidebar?: boolean;
  sectionTitle?: string;
  eyebrow?: string;
}

export default function IncidentLog({
  incidents,
  embedded = false,
  sidebar = false,
  sectionTitle = sidebar ? "Recent Issues" : "Recent Problems",
  eyebrow = sidebar ? "Crash & Maintenance" : "Crash & Maintenance Log",
}: IncidentLogProps) {
  const sectionClass = embedded
    ? ""
    : sidebar
      ? "glass-panel glow-ring rounded-3xl p-5 md:p-6"
      : "glass-panel glow-ring rounded-3xl p-6 md:p-8";

  return (
    <section className={sectionClass}>
      {sidebar ? (
        <SidebarPanelHeader
          icon={<AlertTriangle className="h-4 w-4 text-rose-300" />}
          iconClassName="border-rose-400/25 bg-rose-500/10"
          eyebrow={eyebrow}
          title={sectionTitle}
        />
      ) : (
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3">
            <AlertTriangle className="h-5 w-5 text-rose-300" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.35em] text-rose-200/80">
              {eyebrow}
            </p>
            <h2 className="heading-section text-2xl uppercase text-white">
              {sectionTitle}
            </h2>
          </div>
        </div>
      )}

      {incidents.length === 0 ? (
        sidebar ? (
          <SidebarEmptyState message="All servers are up and running. Time to game!" />
        ) : (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-emerald-200">
              All servers are up and running. Time to game!
            </p>
          </div>
        )
      ) : (
        <ul className="space-y-3">
          {incidents.map((incident, index) => {
            const publishedIso = resolveIncidentDateIso(incident);

            return (
              <li
                key={`${incident.gameSlug}-${publishedIso ?? index}`}
                className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4 transition hover:border-rose-400/20 hover:bg-white/[0.06]"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${getTimelineBlockClass(incident.status)}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-slate-100">
                      {formatIncidentMessage(incident)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${getIncidentAccentClass(incident.status)}`}
                      >
                        {incident.status}
                      </span>
                      <time
                        dateTime={publishedIso ?? undefined}
                        className="text-[11px] text-slate-500"
                      >
                        {formatTelemetryTimestamp(incident)}
                      </time>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
