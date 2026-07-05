import Link from "next/link";
import { Gauge, Radio } from "lucide-react";
import StatusTimeline from "@/components/dashboard/telemetry/StatusTimeline";
import ConnectivityBadge from "@/components/ui/ConnectivityBadge";
import StatusBadge from "@/components/ui/StatusBadge";
import { APP_ROUTES } from "@/config/routes";
import {
  formatDataSource,
  formatSlugLabel,
  formatTelemetryTimestamp,
} from "@/lib/telemetry";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";

interface GameTelemetryCardProps {
  telemetry: GameTelemetry;
  linkToProfile?: boolean;
  linkToStatusPage?: boolean;
  history?: TelemetryHistorySnapshot[];
}

export default function GameTelemetryCard({
  telemetry,
  linkToProfile = true,
  linkToStatusPage = true,
  history = [],
}: GameTelemetryCardProps) {
  const title = formatSlugLabel(telemetry.gameSlug);
  const statusHref = APP_ROUTES.status(telemetry.gameSlug);

  return (
    <article className="rounded-2xl border border-white/8 bg-white/[0.04] p-5 transition hover:border-violet-400/25 hover:bg-white/[0.06]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white">
            {linkToStatusPage ? (
              <Link href={statusHref} className="transition hover:text-cyan-200">
                {title}
              </Link>
            ) : linkToProfile ? (
              <Link
                href={APP_ROUTES.release(telemetry.gameSlug)}
                className="transition hover:text-cyan-200"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          <ConnectivityBadge
            status={telemetry.status}
            source={telemetry.dataSource}
          />
        </div>

        <StatusBadge status={telemetry.status} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-[0.14em] text-cyan-200/90">
          <Gauge className="h-3.5 w-3.5 text-cyan-300/80" />
          {formatDataSource(telemetry.dataSource)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Radio className="h-3.5 w-3.5" />
          <time dateTime={telemetry.lastChecked}>
            {formatTelemetryTimestamp(telemetry.lastChecked)}
          </time>
        </span>
      </div>

      <StatusTimeline snapshots={history} />
    </article>
  );
}
