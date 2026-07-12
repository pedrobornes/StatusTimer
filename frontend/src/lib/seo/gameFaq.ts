import type { TelemetryStatus } from "@/types/telemetry";
import { formatStatusCheckFaqTimestamp } from "@/utils/dateFormatter";

export interface GameFaqItem {
  question: string;
  answer: string;
}

const MONITORING_AGE_HOURS = 48;

export function isMonitoringAgeMet(
  firstMonitoredAt: string | null | undefined,
): boolean {
  if (!firstMonitoredAt) {
    return false;
  }

  const monitoredMs = Date.now() - new Date(firstMonitoredAt).getTime();
  return monitoredMs >= MONITORING_AGE_HOURS * 60 * 60 * 1000;
}

export function buildGameStatusFaq(input: {
  gameName: string;
  status: TelemetryStatus;
  lastChecked: string;
  livePlayers?: number | null;
  twitchViewers?: number | null;
  incidentCount: number;
  firstMonitoredAt?: string | null;
}): GameFaqItem[] {
  const monitoringAgeMet = isMonitoringAgeMet(input.firstMonitoredAt);
  const audience =
    (input.livePlayers ?? 0) > 0
      ? `${input.livePlayers?.toLocaleString()} Steam players`
      : (input.twitchViewers ?? 0) > 0
        ? `${input.twitchViewers?.toLocaleString()} Twitch viewers`
        : "live audience signals";

  const statusAnswer =
    input.status === "ONLINE"
      ? `${input.gameName} servers look online as of the latest probe.`
      : input.status === "MAINTENANCE"
        ? `${input.gameName} is currently in maintenance according to live checks.`
        : input.status === "DOWN"
          ? `${input.gameName} looks disrupted right now based on recent probes.`
          : `${input.gameName} has not launched yet or has no live probe signal.`;

  const items: GameFaqItem[] = [
    {
      question: `Is ${input.gameName} down right now?`,
      answer: `${statusAnswer} Last checked ${formatStatusCheckFaqTimestamp(input.lastChecked)}.`,
    },
    {
      question: `How does StatusTimer check ${input.gameName} server status?`,
      answer: `We combine official status signals, network probes, and live audience metrics (${audience}) to avoid showing stale or invented data.`,
    },
    {
      question: `How often is ${input.gameName} monitored?`,
      answer: monitoringAgeMet
        ? `${input.gameName} is on an active monitoring schedule. Core priority titles are checked every few minutes; other catalog games follow a slower tier-based schedule. Heartbeat history and incident tracking appear here once monitoring is established.`
        : `${input.gameName} was recently activated on-demand. Full incident history appears after 48 hours of monitoring.`,
    },
  ];

  if (monitoringAgeMet && input.incidentCount > 0) {
    items.push({
      question: `Has ${input.gameName} had recent server issues?`,
      answer: `Yes. We recorded ${input.incidentCount} recent disruption${input.incidentCount === 1 ? "" : "s"} in the last monitoring window.`,
    });
  } else {
    items.push({
      question: `Why is there limited outage history for ${input.gameName}?`,
      answer: `Either the game is newly monitored or servers have been stable. We only publish incident copy when real events exist.`,
    });
  }

  items.push({
    question: `Where can I read ${input.gameName} patch notes and updates?`,
    answer: `Official patch notes and game updates for ${input.gameName} are listed on this status page and in our news section when publishers release them.`,
  });

  return items;
}
