import { notFound } from "next/navigation";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import PageShell from "@/components/PageShell";
import JsonLdScript from "@/components/seo/JsonLdScript";
import { APP_ROUTES, TRACKED_GAME_SLUGS } from "@/config/routes";
import { buildStatusPageJsonLd } from "@/lib/seo/jsonLd";
import { buildStatusPageMetadata } from "@/lib/seo/metadata";
import { formatSlugLabel } from "@/lib/telemetry";
import { getGamingNews } from "@/services/newsService";
import {
  getGameTelemetryBySlug,
  getTelemetryHistory,
  getTelemetryIncidents,
} from "@/services/telemetryService";

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
  const gameName = formatSlugLabel(slug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pageUrl = `${siteUrl}${APP_ROUTES.status(slug)}`;

  try {
    const [telemetry, history, incidents, news] = await Promise.all([
      getGameTelemetryBySlug(slug),
      getTelemetryHistory(slug).catch(() => []),
      getTelemetryIncidents().catch(() => []),
      getGamingNews().catch(() => []),
    ]);

    const gameIncidents = incidents.filter((incident) => incident.gameSlug === slug);
    const gameNews = news
      .filter((article) => article.gameTag === slug)
      .slice(0, 6);

    const jsonLd = buildStatusPageJsonLd({
      gameSlug: slug,
      status: telemetry.status,
      lastChecked: telemetry.lastChecked,
      pageUrl,
      siteUrl,
      incidentCount: gameIncidents.length,
    });

    return (
      <>
        <JsonLdScript data={jsonLd} />

        <PageShell
          badge="Live Server Status"
          title={`Is ${gameName} Down?`}
          subtitle={buildStatusPageSubtitle(gameName, telemetry.status)}
        >
          <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-8">
              <section aria-labelledby="server-status-heading">
                <h2
                  id="server-status-heading"
                  className="heading-section mb-6 text-2xl uppercase text-white"
                >
                  {gameName} Server Status Monitor
                </h2>
                <GameTelemetryCard
                  telemetry={telemetry}
                  linkToStatusPage={false}
                  linkToProfile
                  history={history}
                />
              </section>

              <IncidentLog
                incidents={gameIncidents}
                sectionTitle="Recent Incident Reports"
                eyebrow="Outage History"
              />
            </div>

            <NewsFeedPanel
              news={gameNews}
              fillHeight
              sectionTitle="Recent Patch Intel"
              eyebrow="AI Intelligence"
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
  status: "ONLINE" | "MAINTENANCE" | "DOWN",
): string {
  if (status === "DOWN") {
    return `${gameName} is currently flagged DOWN. Review live telemetry, incident reports, and patch intel below.`;
  }

  if (status === "MAINTENANCE") {
    return `${gameName} is under maintenance. Track live telemetry, incident reports, and patch intel below.`;
  }

  return `Live ${gameName} telemetry, incident reports, and Ollama-processed patch intelligence.`;
}
