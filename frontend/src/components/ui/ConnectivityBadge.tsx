import { getConnectivityBadge } from "@/lib/intelFeed";
import type { TelemetrySource, TelemetryStatus } from "@/types/telemetry";

interface ConnectivityBadgeProps {
  status: TelemetryStatus;
  source: TelemetrySource;
}

export default function ConnectivityBadge({ status, source }: ConnectivityBadgeProps) {
  const badge = getConnectivityBadge(status, source);

  return (
    <span
      className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
