import Link from "next/link";
import { Gauge, Radio } from "lucide-react";
import StatusTimeline from "@/components/telemetry/StatusTimeline";
import {
  formatDataSource,
  formatLatency,
  formatSlugLabel,
  formatTelemetryTimestamp,
  getTelemetryStatusVisual,
} from "@/lib/telemetry";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";

interface GameTelemetryCardProps {
  telemetry: GameTelemetry;
  linkToProfile?: boolean;
  history?: TelemetryHistorySnapshot[];
}

function formatTimestamp(value: string): string {
  return formatTelemetryTimestamp(value);
}

export default function GameTelemetryCard({
  telemetry,
  linkToProfile = true,
  history = [],
}: GameTelemetryCardProps) {
  const visual = getTelemetryStatusVisual(telemetry.status);
  const title = formatSlugLabel(telemetry.gameSlug);

  return (
    <article className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 transition hover:border-violet-400/25 hover:bg-white/[0.06]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-semibold text-white">
            {linkToProfile ? (
              <Link
                href={`/release/${telemetry.gameSlug}`}
                className="transition hover:text-cyan-200"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h4>
          <span className="mt-2 inline-flex rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-violet-200/90">
            Gaming
          </span>
        </div>

        <div
          className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${visual.badgeClass}`}
        >
          <span className={`h-2 w-2 rounded-full ${visual.dotClass}`} />
          {visual.label}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-cyan-200">
        <Gauge className="h-4 w-4 text-cyan-300/80" />
        {formatLatency(telemetry.latencyMs)}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
        <span className="uppercase tracking-[0.14em]">
          {formatDataSource(telemetry.dataSource)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Radio className="h-3.5 w-3.5" />
          <time dateTime={telemetry.lastChecked}>
            {formatTimestamp(telemetry.lastChecked)}
          </time>
        </span>
      </div>

      <StatusTimeline snapshots={history} />
    </article>
  );
}
