import { formatRelativeTime } from "@/utils/dateFormatter";
import type { TelemetryIncident, TelemetryStatus } from "@/types/telemetry";
import { isMonitoringAgeMet } from "@/lib/seo/gameFaq";

const numberFormatter = new Intl.NumberFormat("en-US");

export interface StatusContextInsight {
  statusHeadline: string;
  statusDetail: string;
  audienceHeadline: string;
  audienceDetail: string;
  monitoringHeadline?: string;
  monitoringDetail?: string;
  reliabilityHeadline?: string;
  reliabilityDetail?: string;
}

export function buildStatusContextInsight(input: {
  gameName: string;
  status: TelemetryStatus;
  lastChecked: string;
  livePlayers?: number | null;
  twitchViewers?: number | null;
  incidents: TelemetryIncident[];
  firstMonitoredAt?: string | null;
  uptime7dPercent?: number | null;
  uptime30dPercent?: number | null;
}): StatusContextInsight {
  const relativeChecked = formatRelativeTime(input.lastChecked);
  const monitoringAgeMet = isMonitoringAgeMet(input.firstMonitoredAt);

  const statusHeadline =
    input.status === "ONLINE"
      ? "Servers look operational"
      : input.status === "MAINTENANCE"
        ? "Maintenance in progress"
        : input.status === "DOWN"
          ? "Disruption detected"
          : "Awaiting stronger signal";

  const statusDetail =
    input.status === "ONLINE"
      ? `${input.gameName} passed the latest live probe ${relativeChecked}.`
      : input.status === "MAINTENANCE"
        ? `${input.gameName} is in maintenance. Last update ${relativeChecked}.`
        : input.status === "DOWN"
          ? `${input.gameName} appears disrupted right now. Last probe ${relativeChecked}.`
          : `${input.gameName} is tracked as upcoming or waiting for a stronger live signal.`;

  const hasSteamPlayers = (input.livePlayers ?? 0) > 0;
  const hasTwitchViewers = (input.twitchViewers ?? 0) > 0;

  const audienceHeadline = hasSteamPlayers || hasTwitchViewers
    ? "Audience activity detected"
    : "Collecting audience metrics";

  const audienceParts: string[] = [];
  if (hasSteamPlayers) {
    audienceParts.push(
      `${numberFormatter.format(input.livePlayers ?? 0)} Steam players`,
    );
  }
  if (hasTwitchViewers) {
    audienceParts.push(
      `${numberFormatter.format(input.twitchViewers ?? 0)} Twitch viewers`,
    );
  }

  const audienceDetail = hasSteamPlayers || hasTwitchViewers
    ? `Current audience: ${audienceParts.join(" and ")}.`
    : `We are still collecting live audience metrics for ${input.gameName}.`;

  if (!monitoringAgeMet) {
    return {
      statusHeadline,
      statusDetail,
      audienceHeadline,
      audienceDetail,
      monitoringHeadline: "Recently activated",
      monitoringDetail:
        "This page was added to active monitoring recently, so we focus on current availability instead of inventing long outage histories.",
    };
  }

  const recentIncidents = input.incidents.length;
  const reliabilityHeadline =
    recentIncidents > 0
      ? `${recentIncidents} recent incident${recentIncidents === 1 ? "" : "s"}`
      : "Stable in recent window";

  const reliabilityDetail =
    recentIncidents > 0
      ? `We logged ${recentIncidents} maintenance or outage block${recentIncidents === 1 ? "" : "s"} in the current monitoring window.`
      : `${input.gameName} has been stable in the recent monitoring window with no recorded maintenance or outage blocks.`;

  const uptimeDetail = buildUptimeDetail(
    input.uptime7dPercent,
    input.uptime30dPercent,
  );

  return {
    statusHeadline,
    statusDetail,
    audienceHeadline,
    audienceDetail,
    reliabilityHeadline,
    reliabilityDetail: uptimeDetail
      ? `${reliabilityDetail} ${uptimeDetail}`
      : reliabilityDetail,
  };
}

/** @deprecated Use buildStatusContextInsight for structured rendering. */
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
  const insight = buildStatusContextInsight(input);

  return [
    `${insight.statusHeadline}. ${insight.statusDetail}`,
    `${insight.audienceDetail}${insight.monitoringDetail ? ` ${insight.monitoringDetail}` : ""}${insight.reliabilityDetail ? ` ${insight.reliabilityDetail}` : ""}`,
  ];
}

function buildUptimeDetail(
  uptime7dPercent: number | null | undefined,
  uptime30dPercent: number | null | undefined,
): string | null {
  if (uptime7dPercent == null && uptime30dPercent == null) {
    return null;
  }

  if (uptime7dPercent != null && uptime30dPercent != null) {
    return `Rollup checks estimate about ${uptime7dPercent}% uptime over 7 days and ${uptime30dPercent}% over 30 days.`;
  }

  if (uptime7dPercent != null) {
    return `Rollup checks estimate about ${uptime7dPercent}% uptime over the last 7 days.`;
  }

  return `Rollup checks estimate about ${uptime30dPercent}% uptime over the last 30 days.`;
}
