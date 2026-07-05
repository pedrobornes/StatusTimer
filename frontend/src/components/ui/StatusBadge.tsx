import type { TelemetryStatus } from "@/types/telemetry";
import { getTelemetryStatusVisual } from "@/lib/telemetry";

interface StatusBadgeProps {
  status: TelemetryStatus;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const visual = getTelemetryStatusVisual(status);

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${visual.badgeClass} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${visual.dotClass}`} />
      {visual.label}
    </div>
  );
}
