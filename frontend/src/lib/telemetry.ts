import type { TelemetryStatus } from "@/types/telemetry";

interface StatusVisual {
  label: string;
  badgeClass: string;
  dotClass: string;
}

const STATUS_VISUALS: Record<TelemetryStatus, StatusVisual> = {
  ONLINE: {
    label: "Online",
    badgeClass: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20",
    dotClass: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]",
  },
  MAINTENANCE: {
    label: "Maintenance",
    badgeClass: "bg-amber-500/10 text-amber-200 ring-1 ring-amber-400/25",
    dotClass: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]",
  },
  DOWN: {
    label: "Down",
    badgeClass: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20",
    dotClass: "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]",
  },
};

export function getTelemetryStatusVisual(
  status: TelemetryStatus,
): StatusVisual {
  return STATUS_VISUALS[status];
}

export function formatSlugLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatLatency(latencyMs: number): string {
  return `${latencyMs.toLocaleString("en-US")} ms`;
}

export function formatDataSource(source: string): string {
  return source.replaceAll("_", " ");
}
