import {
  Activity,
  Gamepad2,
  Radio,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import SocialStatusCard from "@/components/dashboard/SocialStatusCard";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import { formatLocalizedTimestamp } from "@/utils/dateFormatter";
import type { PlatformDetail, ServerStatus, ServiceCategory } from "@/types/api";
import type {
  GameTelemetry,
  TelemetryHistorySnapshot,
  TelemetryIncident,
} from "@/types/telemetry";

interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  accentClass: string;
  emptyMessage: string;
}

const CATEGORY_CONFIG: Record<ServiceCategory, CategoryConfig> = {
  GAMING: {
    label: "Gaming",
    icon: Gamepad2,
    accentClass: "text-violet-300 border-violet-400/30 bg-violet-500/10",
    emptyMessage: "All game servers look good right now.",
  },
  SOCIAL: {
    label: "Social",
    icon: Users,
    accentClass: "text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10",
    emptyMessage: "Checking social platforms now…",
  },
};

const CATEGORY_ORDER: ServiceCategory[] = ["GAMING", "SOCIAL"];

interface ServerStatusPanelProps {
  statuses: ServerStatus[];
  gameTelemetry?: GameTelemetry[];
  telemetryHistoryBySlug?: Record<string, TelemetryHistorySnapshot[]>;
  platformsBySlug?: Record<string, PlatformDetail[]>;
  incidents?: TelemetryIncident[];
  gamingEmptyMessage?: string;
}

export default function ServerStatusPanel({
  statuses,
  gameTelemetry = [],
  telemetryHistoryBySlug = {},
  platformsBySlug = {},
  incidents = [],
  gamingEmptyMessage,
}: ServerStatusPanelProps) {
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: statuses.filter((status) => status.category === category),
  }));

  return (
    <section className="glass-panel glow-ring rounded-3xl p-6 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
          <Activity className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.35em] text-violet-200/85">
            Live Monitor
          </p>
          <h2 className="heading-section text-2xl uppercase text-white">
            SERVER LIVE STATUS
          </h2>
        </div>
      </div>

      <div className="space-y-8">
        {grouped.map(({ category, items }) => {
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;
          const isGaming = category === "GAMING";
          const hasGamingTelemetry = isGaming && gameTelemetry.length > 0;
          const hasPlatformItems = items.length > 0;
          const emptyMessage = isGaming
            ? (gamingEmptyMessage ?? config.emptyMessage)
            : config.emptyMessage;

          return (
            <div key={category}>
              <div className="mb-4 flex items-center gap-2">
                <Icon className="h-4 w-4 text-violet-300/80" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-300">
                  {config.label}
                </h3>
              </div>

              {isGaming ? (
                hasGamingTelemetry ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {gameTelemetry.map((entry) => (
                      <GameTelemetryCard
                        key={entry.id}
                        telemetry={entry}
                        history={telemetryHistoryBySlug[entry.gameSlug] ?? []}
                        platforms={platformsBySlug[entry.gameSlug] ?? []}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-violet-400/20 px-4 py-6 text-sm text-slate-400">
                    {emptyMessage}
                  </p>
                )
              ) : hasPlatformItems ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((status) => (
                    <SocialStatusCard key={status.id} status={status} />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-violet-400/20 px-4 py-6 text-sm text-slate-400">
                  {emptyMessage}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 border-t border-white/8 pt-8">
        <IncidentLog incidents={incidents} embedded />
      </div>
    </section>
  );
}

interface StatusCardProps {
  status: ServerStatus;
  config: CategoryConfig;
}

export function StatusCard({ status, config }: StatusCardProps) {
  const isOnline = status.isUp;

  return (
    <article className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 transition hover:border-violet-400/25 hover:bg-white/[0.06]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-white">
            {status.serviceName}
          </h4>
          <span
            className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${config.accentClass}`}
          >
            {config.label}
          </span>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
            isOnline
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20"
              : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isOnline
                ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]"
                : "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]"
            }`}
          />
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Radio className="h-3.5 w-3.5" />
        <time dateTime={status.lastChecked}>
          Last checked {formatLocalizedTimestamp(status.lastChecked)}
        </time>
      </div>
    </article>
  );
}
