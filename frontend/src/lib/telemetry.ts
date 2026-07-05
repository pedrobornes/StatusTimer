import type { TelemetryIncident, TelemetryStatus } from "@/types/telemetry";

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

const TIMELINE_BLOCK_CLASSES: Record<TelemetryStatus, string> = {
  ONLINE:
    "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)] ring-1 ring-emerald-300/40",
  MAINTENANCE:
    "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)] ring-1 ring-amber-300/35",
  DOWN: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.85)] ring-1 ring-rose-300/40",
};

export const TIMELINE_EMPTY_BLOCK_CLASS =
  "bg-slate-700/40 ring-1 ring-white/5";

export function getTelemetryStatusVisual(
  status: TelemetryStatus,
): StatusVisual {
  return STATUS_VISUALS[status];
}

export function getTimelineBlockClass(status: TelemetryStatus): string {
  return TIMELINE_BLOCK_CLASSES[status];
}

export function formatTelemetryTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

const INCIDENT_STATUS_LABELS: Record<Exclude<TelemetryStatus, "ONLINE">, string> =
  {
    DOWN: "Outage Detected",
    MAINTENANCE: "Maintenance Detected",
  };

export function formatTimeAgo(isoTimestamp: string, nowMs = Date.now()): string {
  const elapsedMs = Math.max(0, nowMs - new Date(isoTimestamp).getTime());
  const elapsedSec = Math.floor(elapsedMs / 1000);

  if (elapsedSec < 60) {
    return `${elapsedSec}s ago`;
  }

  const elapsedMin = Math.floor(elapsedSec / 60);
  if (elapsedMin < 60) {
    return `${elapsedMin}m ago`;
  }

  const elapsedHours = Math.floor(elapsedMin / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours}h ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays}d ago`;
}

export function formatIncidentMessage(incident: TelemetryIncident): string {
  const game = formatSlugLabel(incident.gameSlug);
  const statusLabel =
    incident.status === "ONLINE"
      ? "Status Change Detected"
      : INCIDENT_STATUS_LABELS[incident.status];

  return `${game} - ${statusLabel} via ${incident.dataSource} - ${formatTimeAgo(incident.timestamp)}`;
}

export function getIncidentAccentClass(status: TelemetryStatus): string {
  if (status === "MAINTENANCE") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  }

  return "border-rose-400/25 bg-rose-500/10 text-rose-200";
}
