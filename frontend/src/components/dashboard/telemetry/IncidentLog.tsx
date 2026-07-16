import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import SidebarPanelHeader, {
  SidebarEmptyState,
} from "@/components/dashboard/SidebarPanelHeader";
import { APP_ROUTES } from "@/config/routes";
import {
  formatIncidentMessage,
  getIncidentAccentClass,
  getTimelineBlockClass,
} from "@/lib/telemetry";
import { resolveSocialServiceBrand } from "@/lib/socialServices";
import type { ServerStatus } from "@/types/api";
import type { TelemetryIncident } from "@/types/telemetry";
import { formatLocalizedTimestamp } from "@/utils/dateFormatter";

interface IncidentLogProps {
  incidents: TelemetryIncident[];
  platformAlerts?: ServerStatus[];
  excludedGameSlugs?: readonly string[];
  embedded?: boolean;
  sidebar?: boolean;
  sectionTitle?: string;
  eyebrow?: string;
}

export default function IncidentLog({
  incidents,
  platformAlerts = [],
  excludedGameSlugs = [],
  embedded = false,
  sidebar = false,
  sectionTitle = sidebar ? "Recent Issues" : "Recent Problems",
  eyebrow = sidebar ? "Crash & Maintenance" : "Crash & Maintenance Log",
}: IncidentLogProps) {
  const excludedSlugs = new Set(excludedGameSlugs.map((slug) => slug.toLowerCase()));
  const seenIncidentSlugs = new Set<string>();
  const filteredIncidents = incidents.filter((incident) => {
    if (incident.status === "UPCOMING") {
      return false;
    }

    const slug = incident.gameSlug.toLowerCase();
    if (excludedSlugs.has(slug) || seenIncidentSlugs.has(slug)) {
      return false;
    }

    seenIncidentSlugs.add(slug);
    return true;
  });

  const hasIssues = filteredIncidents.length > 0 || platformAlerts.length > 0;
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

      {!hasIssues ? (
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
          {platformAlerts.map((status) => {
            const brand = resolveSocialServiceBrand(status.serviceSlug);
            const label = brand?.label ?? status.serviceName;
            const initials =
              brand?.initials ?? status.serviceName.slice(0, 2).toUpperCase();

            return (
              <li
                key={`social-${status.serviceSlug}-${status.id}`}
                className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-4 transition hover:bg-rose-500/15"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-rose-400/30 bg-black/20">
                    {brand?.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt=""
                        className="h-6 w-6 object-contain"
                      />
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wide text-rose-100">
                        {initials}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-slate-100">
                      {label} is currently unavailable.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full border border-rose-400/35 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-rose-200">
                        OUTAGE
                      </span>
                      <time
                        dateTime={status.lastChecked}
                        className="text-[11px] text-slate-300/80"
                      >
                        Last checked {formatLocalizedTimestamp(status.lastChecked)}
                      </time>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}

          {filteredIncidents.map((incident) => (
              <li key={incident.gameSlug}>
                <Link
                  href={APP_ROUTES.status(incident.gameSlug)}
                  className="block rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4 transition hover:border-rose-400/20 hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300/60"
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
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${getIncidentAccentClass(incident.status)}`}
                        >
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
