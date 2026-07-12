import type { Metadata } from "next";
import Dashboard from "@/components/dashboard/Dashboard";
import DashboardError from "@/components/dashboard/DashboardError";
import { resolveUserFacingError } from "@/lib/userFacingErrors";
import {
  HOME_PAGE_DESCRIPTION,
  HOME_PAGE_OG_TITLE,
} from "@/config/seo";
import { FETCH_REVALIDATE_DEFAULT } from "@/config/cache";
import { DASHBOARD_TELEMETRY_LIMIT } from "@/config/telemetryDisplay";
import type { ApiRequestOptions } from "@/services/api";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getServerStatuses } from "@/services/statusService";
import {
  getDashboardTelemetry,
  getGameTelemetry,
  getTelemetryIncidents,
} from "@/services/telemetryService";
import type { GamingNews } from "@/types/api";
import type { GameTelemetry } from "@/types/telemetry";

export const metadata: Metadata = {
  title: "StatusTimer | Live Game Server Status & Patch Notes",
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

export const revalidate = 600;

const DASHBOARD_NEWS_LIMIT = 4;
const SERVER_FETCH_OPTIONS: ApiRequestOptions = {
  revalidate: FETCH_REVALIDATE_DEFAULT,
};

function selectDashboardNews(news: GamingNews[]): GamingNews[] {
  return news.slice(0, DASHBOARD_NEWS_LIMIT);
}

async function loadDashboardTelemetry(
  limit: number,
): Promise<GameTelemetry[]> {
  try {
    const twitchRanked = await getDashboardTelemetry(limit, SERVER_FETCH_OPTIONS);
    if (twitchRanked.length > 0) {
      return twitchRanked;
    }
  } catch {
    // Fall through to featured telemetry when the dashboard endpoint is unavailable.
  }

  try {
    const featured = await getGameTelemetry({
      featured: true,
      ...SERVER_FETCH_OPTIONS,
    });
    return featured.slice(0, limit);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  try {
    const [gameTelemetry, releases, incidents, statuses, news] =
      await Promise.all([
        loadDashboardTelemetry(DASHBOARD_TELEMETRY_LIMIT),
        getUpcomingReleases().catch(() => []),
        getTelemetryIncidents().catch(() => []),
        getServerStatuses().catch(() => []),
        getGamingNews({ tier: 1 }).catch(() => []),
      ]);

    return (
      <Dashboard
        gameTelemetry={gameTelemetry}
        releases={releases.slice(0, 4)}
        unreleasedSlugs={releases.map((release) => release.slug)}
        incidents={incidents}
        statuses={statuses}
        news={selectDashboardNews(news)}
      />
    );
  } catch (error) {
    return (
      <DashboardError message={resolveUserFacingError(error, "dashboard")} />
    );
  }
}
