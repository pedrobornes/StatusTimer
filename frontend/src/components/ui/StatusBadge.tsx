import type { TelemetryStatus } from "@/types/telemetry";
import { getTelemetryStatusVisual } from "@/lib/telemetry";

interface StatusBadgeProps {
  status: TelemetryStatus;
  className?: string;
  /** Dot-only on small screens to avoid crowding telemetry cards. */
  compact?: boolean;
}

export default function StatusBadge({
  status,
  className = "",
  compact = false,
}: StatusBadgeProps) {
  const visual = getTelemetryStatusVisual(status);

  return (
    <div
      title={compact ? visual.label : undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium sm:gap-2 sm:px-3 sm:text-xs ${visual.badgeClass} ${className}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${visual.dotClass}`} />
      <span className={compact ? "hidden sm:inline" : ""}>{visual.label}</span>
    </div>
  );
}
