import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import TelemetryStatusHub from "@/components/dashboard/TelemetryStatusHub";
import DashboardError from "@/components/dashboard/DashboardError";
import { resolveUserFacingError } from "@/lib/userFacingErrors";
import { GAMES_PAGE_SUBTITLE } from "@/config/seo";
import { CATALOG_GAMES_PAGE_SIZE } from "@/config/catalog";
import { buildPlatformsBySlug } from "@/lib/releases";
import { getCatalogGames, getCatalogGenres } from "@/services/catalogService";
import { getUpcomingReleases } from "@/services/releasesService";

export const metadata: Metadata = {
  title: "Game Server Live Status & Patch Notes",
  description:
    "Browse live game server status — online, down, or maintenance — with patch notes, game updates, player counts, and recent outages for every tracked title.",
};

export const revalidate = 600;

export default async function GamesPage() {
  try {
    const [catalogPage, catalogGenres] = await Promise.all([
      getCatalogGames({ page: 0, size: CATALOG_GAMES_PAGE_SIZE }).catch(() => ({
        items: [],
        page: 0,
        size: CATALOG_GAMES_PAGE_SIZE,
        totalElements: 0,
        totalPages: 0,
      })),
      getCatalogGenres().catch(() => []),
    ]);

    const releases = await getUpcomingReleases().catch(() => []);
    const platformsBySlug = buildPlatformsBySlug(releases);

    return (
      <PageShell
        title="Game server live status"
        subtitle={GAMES_PAGE_SUBTITLE}
        badge="Games"
      >
        <TelemetryStatusHub
          initialCatalogPage={{
            items: catalogPage.items,
            page: catalogPage.page,
            totalPages: catalogPage.totalPages,
            totalElements: catalogPage.totalElements,
          }}
          initialGenreOptions={catalogGenres}
          platformsBySlug={platformsBySlug}
        />
      </PageShell>
    );
  } catch (error) {
    return (
      <DashboardError message={resolveUserFacingError(error, "games")} />
    );
  }
}
