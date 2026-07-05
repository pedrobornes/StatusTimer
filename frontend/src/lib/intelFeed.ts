import type { TelemetrySource, TelemetryStatus } from "@/types/telemetry";

export type IntelArticleKind = "INCIDENT" | "PATCH" | "RELEASE" | "GENERAL";

export interface IntelTextSegment {
  type: "text" | "errorCode" | "region" | "emphasis";
  value: string;
}

const ERROR_CODE_PATTERN =
  /\b(?:RIFT-\d+|VAN\s*-?\s*\d+|[A-Z]{2,}-\d+)\b/gi;

const REGION_PATTERN =
  /\b(?:NA|EUW|EUNE|BR|LATAM|APAC|OCE|EMEA|North America|Latin America|Americas)\b/g;

const HIGHLIGHT_PATTERN = new RegExp(
  `(${ERROR_CODE_PATTERN.source}|${REGION_PATTERN.source})`,
  "gi",
);

export function classifyIntelArticle(title: string): IntelArticleKind {
  const normalized = title.toUpperCase();

  if (normalized.includes("[INCIDENT BRIEF]")) {
    return "INCIDENT";
  }

  if (normalized.includes("[RELEASE INTEL]")) {
    return "RELEASE";
  }

  if (
    normalized.includes("PATCH") ||
    normalized.includes("UPDATE") ||
    normalized.includes("BALANCE")
  ) {
    return "PATCH";
  }

  return "GENERAL";
}

export function getIntelArticleAccent(kind: IntelArticleKind): {
  badgeClass: string;
  borderClass: string;
  label: string;
} {
  if (kind === "INCIDENT") {
    return {
      label: "Incident Brief",
      badgeClass:
        "border-rose-400/30 bg-rose-500/10 text-rose-100",
      borderClass: "hover:border-rose-400/30",
    };
  }

  if (kind === "RELEASE") {
    return {
      label: "Release Intel",
      badgeClass:
        "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
      borderClass: "hover:border-cyan-400/30",
    };
  }

  if (kind === "PATCH") {
    return {
      label: "Patch Intel",
      badgeClass:
        "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100",
      borderClass: "hover:border-fuchsia-400/30",
    };
  }

  return {
    label: "Platform Intel",
    badgeClass:
      "border-violet-400/30 bg-violet-500/10 text-violet-100",
    borderClass: "hover:border-violet-400/30",
  };
}

function classifySegment(value: string): IntelTextSegment["type"] {
  ERROR_CODE_PATTERN.lastIndex = 0;
  REGION_PATTERN.lastIndex = 0;

  if (ERROR_CODE_PATTERN.test(value)) {
    return "errorCode";
  }

  if (REGION_PATTERN.test(value)) {
    return "region";
  }

  return "text";
}

export function splitIntelInlineSegments(line: string): IntelTextSegment[] {
  const parts = line.split(HIGHLIGHT_PATTERN).filter((part) => part.length > 0);

  return parts.map((part) => ({
    type: classifySegment(part),
    value: part,
  }));
}

export function parseIntelContentBlocks(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function stripMarkdownEmphasis(line: string): {
  kind: "bullet" | "heading" | "paragraph";
  text: string;
} {
  if (line.startsWith("- ")) {
    return { kind: "bullet", text: line.slice(2).trim() };
  }

  if (line.startsWith("**") && line.endsWith("**")) {
    return { kind: "heading", text: line.slice(2, -2).trim() };
  }

  return { kind: "paragraph", text: line.replace(/\*\*/g, "").trim() };
}

export function getConnectivityBadge(
  status: TelemetryStatus,
  source: TelemetrySource,
): { label: string; className: string } {
  if (status === "DOWN") {
    return {
      label: "Service Disrupted",
      className:
        "border-rose-400/30 bg-rose-500/10 text-rose-200",
    };
  }

  if (status === "MAINTENANCE") {
    return {
      label: "Maintenance Window",
      className:
        "border-amber-400/30 bg-amber-500/10 text-amber-200",
    };
  }

  if (source === "STEAM_API") {
    return {
      label: "Stable Connection",
      className:
        "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (source === "STATUS_PAGE") {
    return {
      label: "Status Page Sync",
      className:
        "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    };
  }

  return {
    label: "Network Probe",
    className:
      "border-violet-400/30 bg-violet-500/10 text-violet-200",
  };
}
