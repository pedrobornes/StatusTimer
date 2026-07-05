/**
 * Unified backend date parsing and display formatting.
 * Supports ISO-8601 strings and Jackson-style LocalDateTime arrays.
 */

export type BackendDateParts = [
  number,
  number,
  number,
  number?,
  number?,
  number?,
  number?,
];

export type BackendDateInput =
  | string
  | BackendDateParts
  | null
  | undefined;

const DEFAULT_RECORD_DATE_KEYS = [
  "publishedAt",
  "timestamp",
  "lastChecked",
  "createdAt",
  "checkedAt",
] as const;

function isBackendDateParts(value: unknown): value is BackendDateParts {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    typeof value[2] === "number"
  );
}

export function parseBackendDate(input: BackendDateInput): Date | null {
  if (input == null) {
    return null;
  }

  if (isBackendDateParts(input)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] =
      input;
    const milliseconds =
      typeof nano === "number" && nano > 0 && nano < 1_000_000_000
        ? Math.floor(nano / 1_000_000)
        : 0;
    const date = new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      milliseconds,
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function resolveRecordDate(
  record: Record<string, unknown>,
  preferredKeys: readonly string[] = DEFAULT_RECORD_DATE_KEYS,
): Date | null {
  for (const key of preferredKeys) {
    const value = record[key];
    if (typeof value === "string" || isBackendDateParts(value)) {
      const parsed = parseBackendDate(value);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

export function toIsoString(input: BackendDateInput): string | null {
  const date = parseBackendDate(input);
  return date ? date.toISOString() : null;
}

export function formatLocalizedTimestamp(
  input: BackendDateInput,
  locale = "en-US",
): string {
  const date = parseBackendDate(input);
  if (!date) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeTime(
  input: BackendDateInput,
  nowMs = Date.now(),
): string {
  const date = parseBackendDate(input);
  if (!date) {
    return "Unknown time";
  }

  const elapsedMs = Math.max(0, nowMs - date.getTime());
  const elapsedSec = Math.floor(elapsedMs / 1000);

  if (elapsedSec < 10) {
    return "just now";
  }

  if (elapsedSec < 60) {
    return `${elapsedSec} seconds ago`;
  }

  const elapsedMin = Math.floor(elapsedSec / 60);
  if (elapsedMin < 60) {
    return elapsedMin === 1 ? "1 minute ago" : `${elapsedMin} minutes ago`;
  }

  const elapsedHours = Math.floor(elapsedMin / 60);
  if (elapsedHours < 24) {
    return elapsedHours === 1 ? "1 hour ago" : `${elapsedHours} hours ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return elapsedDays === 1 ? "1 day ago" : `${elapsedDays} days ago`;
}
