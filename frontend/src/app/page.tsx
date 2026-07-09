import type { Metadata } from "next";
import Dashboard from "@/components/dashboard/Dashboard";
import DashboardError from "@/components/dashboard/DashboardError";
import { FEATURED_GAME_SLUGS } from "@/config/routes";
import {
  HOME_PAGE_DESCRIPTION,
  HOME_PAGE_OG_TITLE,
} from "@/config/seo";
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
import type { GamingNews } from "@/types/api";
import type { GameTelemetry, TelemetryHistorySnapshot } from "@/types/telemetry";

export const metadata: Metadata = {
  title: "StatusTimer | Live Gaming Server Status Monitor",
  description: HOME_PAGE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: HOME_PAGE_OG_TITLE,
    description: HOME_PAGE_DESCRIPTION,
    url: "/",
    type: "website",
  },
};

export const revalidate = 60;

const DASHBOARD_TELEMETRY_LIMIT = 12;
const DASHBOARD_NEWS_LIMIT = 4;
const LIVE_FETCH_OPTIONS: ApiRequestOptions = { revalidate: 0 };

const FEATURED_SLUG_SET = new Set<string>(FEATURED_GAME_SLUGS);

function selectFeaturedNews(news: GamingNews[]): GamingNews[] {
  return news
    .filter((article) => FEATURED_SLUG_SET.has(article.gameTag))
    .slice(0, DASHBOARD_NEWS_LIMIT);
}

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
    const [gameTelemetry, releases, incidents, statuses, news] =
      await Promise.all([
        loadDashboardTelemetry(DASHBOARD_TELEMETRY_LIMIT),
        getUpcomingReleases(),
        getTelemetryIncidents().catch(() => []),
        getServerStatuses().catch(() => []),
        getGamingNews().catch(() => []),
      ]);

    const historyBySlug = await loadTelemetryHistoryBySlug(
      gameTelemetry.map((entry) => entry.gameSlug),
    );

    return (
      <Dashboard
        gameTelemetry={gameTelemetry}
        historyBySlug={historyBySlug}
        releases={releases.slice(0, 4)}
        unreleasedSlugs={releases.map((release) => release.slug)}
        incidents={incidents}
        statuses={statuses}
        news={selectFeaturedNews(news)}
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
