import { notFound, redirect } from "next/navigation";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import PageShell from "@/components/PageShell";
import JsonLdScript from "@/components/seo/JsonLdScript";
import { APP_ROUTES, TRACKED_GAME_SLUGS } from "@/config/routes";
import {
  resolveGameCoverUrl,
  resolveGameDisplayName,
} from "@/lib/gameAssets";
import { buildStatusPageJsonLd } from "@/lib/seo/jsonLd";
import { buildStatusPageMetadata } from "@/lib/seo/metadata";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { getConfirmedPlatforms } from "@/lib/releases";
import { getGameStatusDetail } from "@/services/telemetryService";
import { getUpcomingReleases } from "@/services/releasesService";
import type { TelemetryStatus } from "@/types/telemetry";

export const revalidate = 60;

export function generateStaticParams() {
  return TRACKED_GAME_SLUGS.map((slug) => ({ slug }));
}

interface StatusPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StatusPageProps) {
  const { slug } = await params;
  return buildStatusPageMetadata(slug);
}

export default async function GameStatusPage({ params }: StatusPageProps) {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  if (canonicalSlug !== slug) {
    redirect(APP_ROUTES.status(canonicalSlug));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pageUrl = `${siteUrl}${APP_ROUTES.status(slug)}`;

  try {
    const [{ telemetry, history, incidents, news }, releases] = await Promise.all([
      getGameStatusDetail(slug),
      getUpcomingReleases().catch(() => []),
    ]);

    const releasePlatforms = getConfirmedPlatforms(
      releases.find((release) => release.slug === slug)?.platforms ?? [],
    );

    const gameName = resolveGameDisplayName(slug, telemetry);
    const coverUrl = resolveGameCoverUrl(slug, telemetry);

    const jsonLd = buildStatusPageJsonLd({
      gameSlug: slug,
      status: telemetry.status,
      lastChecked: telemetry.lastChecked,
      pageUrl,
      siteUrl,
      incidentCount: incidents.length,
    });

    return (
      <>
        <JsonLdScript data={jsonLd} />

        <PageShell
          badge="Live Server Status"
          title={`Is ${gameName} Down?`}
          subtitle={buildStatusPageSubtitle(gameName, telemetry.status)}
          coverUrl={coverUrl}
          coverAlt={gameName}
        >
          <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-8">
              <section aria-labelledby="server-status-heading">
                <h2
                  id="server-status-heading"
                  className="heading-section mb-2 text-2xl uppercase text-white"
                >
                  Live Server Report
                </h2>
                <p className="mb-6 text-sm leading-6 text-slate-400">
                  Live status data compiled from official game status pages and
                  player networks.
                </p>
                <GameTelemetryCard
                  telemetry={telemetry}
                  linkToStatusPage={false}
                  linkToProfile={false}
                  history={history}
                  platforms={releasePlatforms}
                />
              </section>

              <IncidentLog
                incidents={incidents}
                sectionTitle="Recent Problems"
                eyebrow="Crash & Maintenance Log"
              />
            </div>

            <NewsFeedPanel
              news={news}
              fillHeight
              sectionTitle="Game News & Updates"
              eyebrow="Latest Alerts"
            />
          </div>
        </PageShell>
      </>
    );
  } catch {
    notFound();
  }
}

function buildStatusPageSubtitle(
  gameName: string,
  status: TelemetryStatus,
): string {
  if (status === "UPCOMING") {
    return `${gameName} hasn't launched yet. See the release date and latest news below.`;
  }

  if (status === "DOWN") {
    return `${gameName} servers look down right now. Check the live report and recent alerts below.`;
  }

  if (status === "MAINTENANCE") {
    return `${gameName} is in maintenance. Follow the live report and alerts below.`;
  }

  return `See if ${gameName} servers are up, check recent outages, and read the latest game news.`;
}
