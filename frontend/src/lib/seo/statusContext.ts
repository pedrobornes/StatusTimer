import { formatRelativeTime } from "@/utils/dateFormatter";
import type { TelemetryIncident, TelemetryStatus } from "@/types/telemetry";
import { isMonitoringAgeMet } from "@/lib/seo/gameFaq";

export function buildStatusContextParagraphs(input: {
  gameName: string;
  status: TelemetryStatus;
  lastChecked: string;
  livePlayers?: number | null;
  twitchViewers?: number | null;
  incidents: TelemetryIncident[];
  firstMonitoredAt?: string | null;
  uptime7dPercent?: number | null;
  uptime30dPercent?: number | null;
}): string[] {
  const relativeChecked = formatRelativeTime(input.lastChecked);
  const monitoringAgeMet = isMonitoringAgeMet(input.firstMonitoredAt);

  const statusSentence =
    input.status === "ONLINE"
      ? `${input.gameName} servers look operational based on the latest live check (${relativeChecked}).`
      : input.status === "MAINTENANCE"
        ? `${input.gameName} is in maintenance. The live report was updated ${relativeChecked}.`
        : input.status === "DOWN"
          ? `${input.gameName} appears disrupted right now. Last probe ${relativeChecked}.`
          : `${input.gameName} is tracked as upcoming or awaiting a stronger live signal.`;

  const metricsParts: string[] = [];
  if ((input.livePlayers ?? 0) > 0) {
    metricsParts.push(`${input.livePlayers?.toLocaleString()} concurrent Steam players`);
  }
  if ((input.twitchViewers ?? 0) > 0) {
    metricsParts.push(`${input.twitchViewers?.toLocaleString()} Twitch viewers`);
  }

  const metricsSentence =
    metricsParts.length > 0
      ? `Audience metrics currently show ${metricsParts.join(" and ")}.`
      : `We are still collecting live audience metrics for ${input.gameName}.`;

  if (!monitoringAgeMet) {
    return [
      statusSentence,
      `${metricsSentence} This page was recently added to active monitoring, so we focus on current availability instead of inventing long outage histories.`,
    ];
  }

  const recentIncidents = input.incidents.length;
  const historySentence =
    recentIncidents > 0
      ? `We logged ${recentIncidents} recent incident${recentIncidents === 1 ? "" : "s"} in the monitoring window, helping you see whether issues are isolated or recurring.`
      : `${input.gameName} has been stable in the recent monitoring window with no recorded maintenance or outage blocks.`;

  const uptimeSentence = buildUptimeSentence(
    input.gameName,
    input.uptime7dPercent,
    input.uptime30dPercent,
  );

  const closing = uptimeSentence
    ? `${historySentence} ${uptimeSentence}`
    : historySentence;

  return [statusSentence, `${metricsSentence} ${closing}`];
}

function buildUptimeSentence(
  gameName: string,
  uptime7dPercent: number | null | undefined,
  uptime30dPercent: number | null | undefined,
): string | null {
  if (uptime7dPercent == null && uptime30dPercent == null) {
    return null;
  }

  if (uptime7dPercent != null && uptime30dPercent != null) {
    return `Rollup checks estimate ${gameName} was online about ${uptime7dPercent}% of the time over the last 7 days and ${uptime30dPercent}% over 30 days.`;
  }

  if (uptime7dPercent != null) {
    return `Rollup checks estimate ${gameName} was online about ${uptime7dPercent}% of the time over the last 7 days.`;
  }

  return `Rollup checks estimate ${gameName} was online about ${uptime30dPercent}% of the time over the last 30 days.`;
}
