import { buildGameStatusDescriptionTail, buildGameStatusTitle } from "@/config/routes";
import type { TelemetryStatus } from "@/types/telemetry";
import { formatStatusCheckRelativeLabel } from "@/utils/dateFormatter";

function formatMetaStatusLabel(status: TelemetryStatus): string {
  switch (status) {
    case "ONLINE":
      return "Online";
    case "DOWN":
      return "Down";
    case "MAINTENANCE":
      return "Maintenance";
    case "UPCOMING":
      return "Upcoming";
    default:
      return "Unknown";
  }
}

export function buildGameStatusMetaDescription(
  gameName: string,
  status: TelemetryStatus | null,
  lastChecked: string | null,
): string {
  const tail = buildGameStatusDescriptionTail(gameName);

  if (!status || !lastChecked) {
    return tail;
  }

  const checkedLabel = formatStatusCheckRelativeLabel(lastChecked);
  const statusLabel = formatMetaStatusLabel(status);

  return `Right now: ${statusLabel} — last checked ${checkedLabel}. ${tail}`;
}

export { buildGameStatusTitle };
