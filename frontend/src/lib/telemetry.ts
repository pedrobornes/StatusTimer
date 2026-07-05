import type { TelemetryHistorySnapshot, TelemetryIncident, TelemetryStatus } from "@/types/telemetry";
import {
  formatLocalizedTimestamp,
  formatRelativeTime,
  parseBackendDate,
  resolveRecordDate,
  toIsoString,
} from "@/utils/dateFormatter";

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
  UPCOMING: {
    label: "Upcoming",
    badgeClass: "bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20",
    dotClass: "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]",
  },
};

const TIMELINE_BLOCK_CLASSES: Record<TelemetryStatus, string> = {
  ONLINE:
    "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)] ring-1 ring-emerald-300/40",
  MAINTENANCE:
    "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)] ring-1 ring-amber-300/35",
  DOWN: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.85)] ring-1 ring-rose-300/40",
  UPCOMING: "bg-amber-400/60 ring-1 ring-amber-300/30",
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

export function resolveIncidentDateIso(incident: TelemetryIncident): string | null {
  return toIsoString(
    incident.publishedAt ?? incident.timestamp ?? null,
  );
}

export function resolveHistoryDateIso(snapshot: {
  publishedAt?: string;
  timestamp?: string;
}): string | null {
  return toIsoString(snapshot.publishedAt ?? snapshot.timestamp ?? null);
}

export function formatTelemetryTimestamp(
  value: string | TelemetryIncident | { publishedAt?: string; timestamp?: string },
): string {
  if (typeof value === "string") {
    return formatLocalizedTimestamp(value);
  }

  const resolved = resolveRecordDate(value as Record<string, unknown>);
  return resolved
    ? formatLocalizedTimestamp(resolved.toISOString())
    : "Unknown time";
}

export function formatTimelineBlockTimestamp(
  value: string | { publishedAt?: string; timestamp?: string },
): string {
  const raw =
    typeof value === "string"
      ? value
      : (value.publishedAt ?? value.timestamp ?? "");

  const date = parseBackendDate(raw);
  if (!date) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatTimelineCheckTooltip(
  snapshot: TelemetryHistorySnapshot,
): string {
  return `${snapshot.status} - ${formatTimelineBlockTimestamp(snapshot)}`;
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

const PROBE_SOURCE_BY_SLUG: Record<string, string> = {
  "counter-strike-2": "Official Steam servers",
  "dota-2": "Official Steam servers",
  pubg: "Official Steam servers",
  valorant: "Official Riot status page",
  fortnite: "Official Epic status page",
  "gta-vi": "Official Rockstar updates",
  "league-of-legends": "Official Riot status page",
  "apex-legends": "Official EA / Steam servers",
  "call-of-duty": "Official Activision networks",
  "gta-v": "Official Rockstar servers",
  "rainbow-six-siege": "Official Ubisoft servers",
  "rocket-league": "Official Psyonix servers",
  "destiny-2": "Official Bungie servers",
  rust: "Official Facepunch servers",
  "elden-ring": "Official game networks",
};

export function formatProbeSource(
  gameSlug: string,
  dataSource: string,
): string {
  const mapped = PROBE_SOURCE_BY_SLUG[gameSlug];
  if (mapped) {
    return mapped;
  }

  if (dataSource === "STEAM_API") {
    return "Official Steam servers";
  }

  if (dataSource === "STATUS_PAGE") {
    return "Official game status page";
  }

  return "Official game networks";
}

const INCIDENT_STATUS_LABELS: Record<Exclude<TelemetryStatus, "ONLINE">, string> =
  {
    DOWN: "servers went down",
    MAINTENANCE: "is in maintenance",
    UPCOMING: "hasn't launched yet",
  };

export function formatTimeAgo(
  value: string | TelemetryIncident,
  nowMs = Date.now(),
): string {
  if (typeof value !== "string") {
    const iso = resolveIncidentDateIso(value);
    return iso ? formatRelativeTime(iso, nowMs) : "Unknown time";
  }

  return formatRelativeTime(value, nowMs);
}

export function formatIncidentMessage(incident: TelemetryIncident): string {
  const game = formatSlugLabel(incident.gameSlug);
  const statusLabel =
    incident.status === "ONLINE"
      ? "servers came back online"
      : INCIDENT_STATUS_LABELS[incident.status];

  return `${game} ${statusLabel} · ${formatTimeAgo(incident)}`;
}

export function getIncidentAccentClass(status: TelemetryStatus): string {
  if (status === "MAINTENANCE") {
    return "border-amber-400/25 bg-amber-500/10 text-amber-200";
  }

  return "border-rose-400/25 bg-rose-500/10 text-rose-200";
}
