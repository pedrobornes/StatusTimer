import Dashboard from "@/components/dashboard/Dashboard";
import DashboardError from "@/components/dashboard/DashboardError";
import { TRACKED_GAME_SLUGS } from "@/config/routes";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import {
  getGameTelemetry,
  getTelemetryHistory,
  getTelemetryIncidents,
} from "@/services/telemetryService";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";

export const revalidate = 60;

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

function buildTelemetryBySlug(entries: GameTelemetry[]): Record<string, GameTelemetry> {
  return Object.fromEntries(entries.map((entry) => [entry.gameSlug, entry]));
}

export default async function HomePage() {
  try {
    const [gameTelemetry, news, releases, incidents] = await Promise.all([
      getGameTelemetry().catch(() => []),
      getGamingNews(),
      getUpcomingReleases(),
      getTelemetryIncidents().catch(() => []),
    ]);

    const historyBySlug = await loadTelemetryHistoryBySlug(TRACKED_GAME_SLUGS);

    return (
      <Dashboard
        telemetryBySlug={buildTelemetryBySlug(gameTelemetry)}
        historyBySlug={historyBySlug}
        news={news.slice(0, 12)}
        releases={releases.slice(0, 4)}
        incidents={incidents}
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
