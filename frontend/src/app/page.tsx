import type { Metadata } from "next";
import Dashboard from "@/components/dashboard/Dashboard";
import DashboardError from "@/components/dashboard/DashboardError";
import type { ApiRequestOptions } from "@/services/api";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getServerStatuses } from "@/services/statusService";
import {
  getDashboardTelemetry,
  getGameTelemetry,
  getTelemetryHistory,
  getTelemetryIncidents,
} from "@/services/telemetryService";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";

export const metadata: Metadata = {
  title: "StatusTimer | Live Gaming Server Status & Game News",
  description:
    "Track live multiplayer server status, outages, and release countdowns for top games. Real-time telemetry, incident logs, and gaming news in one dashboard.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "StatusTimer | Live Gaming Server Status & Game News",
    description:
      "Track live multiplayer server status, outages, and release countdowns for top games.",
    url: "/",
    type: "website",
  },
};

export const revalidate = 60;

const DASHBOARD_TELEMETRY_LIMIT = 6;
const LIVE_FETCH_OPTIONS: ApiRequestOptions = { revalidate: 0 };

async function loadDashboardTelemetry(
  limit: number,
): Promise<GameTelemetry[]> {
  try {
    const twitchRanked = await getDashboardTelemetry(limit, LIVE_FETCH_OPTIONS);
    if (twitchRanked.length > 0) {
      return twitchRanked;
    }
  } catch {
    // Fall through to featured telemetry when the dashboard endpoint is unavailable.
  }

  try {
    const featured = await getGameTelemetry({
      featured: true,
      ...LIVE_FETCH_OPTIONS,
    });
    return featured.slice(0, limit);
  } catch {
    return [];
  }
}

async function loadTelemetryHistoryBySlug(
  gameSlugs: readonly string[],
): Promise<Record<string, TelemetryHistorySnapshot[]>> {
  const entries = await Promise.all(
    gameSlugs.map(async (slug) => {
      const history = await getTelemetryHistory(slug).catch(() => []);
      return [slug, history] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export default async function HomePage() {
  try {
    const [gameTelemetry, news, releases, incidents, statuses] = await Promise.all([
      loadDashboardTelemetry(DASHBOARD_TELEMETRY_LIMIT),
      getGamingNews(),
      getUpcomingReleases(),
      getTelemetryIncidents().catch(() => []),
      getServerStatuses().catch(() => []),
    ]);

    const historyBySlug = await loadTelemetryHistoryBySlug(
      gameTelemetry.map((entry) => entry.gameSlug),
    );

    return (
      <Dashboard
        gameTelemetry={gameTelemetry}
        historyBySlug={historyBySlug}
        news={news.slice(0, 12)}
        releases={releases.slice(0, 4)}
        incidents={incidents}
        statuses={statuses}
      />
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load dashboard data from the backend.";

    return <DashboardError message={message} />;
  }
}
