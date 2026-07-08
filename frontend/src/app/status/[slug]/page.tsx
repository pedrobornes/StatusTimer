import { notFound, redirect } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import PendingTelemetryGate from "@/components/dashboard/telemetry/PendingTelemetryGate";
import TelemetryRefreshBanner from "@/components/dashboard/telemetry/TelemetryRefreshBanner";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import SteamStoreWidget from "@/components/dashboard/SteamStoreWidget";
import GameExternalLinks from "@/components/GameExternalLinks";
import GameMediaSidebar from "@/components/GameMediaSidebar";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import PageShell from "@/components/PageShell";
import GameStatusFaq from "@/components/seo/GameStatusFaq";
import JsonLdScript from "@/components/seo/JsonLdScript";
import { APP_ROUTES, TRACKED_GAME_SLUGS } from "@/config/routes";
import {
  resolveGameDisplayName,
} from "@/lib/gameAssets";
import { resolveStatusPageHeroUrl } from "@/lib/statusHero";
import { buildGameStatusFaq } from "@/lib/seo/gameFaq";
import { buildStatusPageJsonLd } from "@/lib/seo/jsonLd";
import { buildStatusPageMetadata } from "@/lib/seo/metadata";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { resolveGenres } from "@/lib/genres";
import { hasGameMedia, resolveGameMedia } from "@/lib/gameMedia";
import { getConfirmedPlatforms } from "@/lib/releases";
import { getGameStatusDetail } from "@/services/telemetryService";
import { getUpcomingReleases } from "@/services/releasesService";
import type { GameTelemetry, TelemetryStatus } from "@/types/telemetry";

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
    const [
      {
        gameName: catalogGameName,
        telemetry,
        history,
        incidents,
        news,
        telemetryReady,
        catalogOnly = false,
        firstMonitoredAt,
        steamStore,
        screenshotUrls,
        trailerVideoIds,
        youtubeChannelUrl,
        externalLinks,
      },
      releases,
    ] = await Promise.all([
      getGameStatusDetail(slug, { revalidate: 0, cache: "no-store" }),
      getUpcomingReleases().catch(() => []),
    ]);

    const releaseEntry = releases.find((release) => release.slug === slug);
    const gameName =
      telemetry?.gameName ?? catalogGameName ?? resolveGameDisplayName(slug, telemetry ?? undefined);
    const coverUrl = resolveStatusPageHeroUrl(slug, telemetry, releaseEntry ?? null);
    const releasePlatforms = getConfirmedPlatforms(releaseEntry?.platforms ?? []);
    const telemetryGenres = resolveGenres(telemetry ?? undefined);
    const genreBadges =
      telemetryGenres.length > 0
        ? telemetryGenres
        : resolveGenres(releaseEntry ?? undefined);

    const steamAppId = steamStore?.steamAppId ?? telemetry?.appId ?? null;
    const gameMedia = resolveGameMedia(
      { screenshotUrls, trailerVideoIds, youtubeChannelUrl },
      telemetry,
    );
    const hasNews = news.length > 0;
    const hasMedia = hasGameMedia(gameMedia);

    if (isUnreleasedGame(telemetry)) {
      notFound();
    }

    const isCatalogProfile = catalogOnly === true;
    const isPendingTelemetry = !telemetryReady && !isCatalogProfile;
    const hasPartialTelemetry = telemetry !== null;
    const isInitialProbe = isPendingTelemetry && !hasPartialTelemetry;
    const isCatalogBootstrap = isPendingTelemetry && hasPartialTelemetry;

    if (isInitialProbe) {
      return (
        <PageShell
          badges={genreBadges}
          title={`Is ${gameName} Down?`}
          subtitle={`We're checking ${gameName} servers right now. It may take a few minutes.`}
          coverUrl={coverUrl}
          coverAlt={gameName}
        >
          <GameStatusSubNav
            slug={slug}
            hasNews={hasNews}
            hasMedia={hasMedia}
          />
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,360px)]">
            <div className="space-y-8">
              <section aria-labelledby="server-status-heading">
                <h2
                  id="server-status-heading"
                  className="heading-section mb-2 text-2xl uppercase text-white"
                >
                  Live Server Report
                </h2>
                <PendingTelemetryGate gameSlug={slug} />
                {hasPartialTelemetry ? (
                  <div className="mt-6">
                    <GameTelemetryCard
                      telemetry={telemetry}
                      linkToStatusPage={false}
                      linkToProfile={false}
                      platforms={releasePlatforms}
                      serverStatusPending
                    />
                  </div>
                ) : null}
              </section>
            </div>

            <div className="space-y-8">
              {steamAppId ? (
                <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
              ) : null}
              <GameExternalLinks links={externalLinks} />
              <GameMediaSidebar gameName={gameName} gameSlug={slug} media={gameMedia} />
              <NewsFeedPanel
                news={news}
                fillHeight
                gameSlug={slug}
                sectionTitle="Game News & Updates"
                eyebrow="Latest Alerts"
              />
            </div>
          </div>
        </PageShell>
      );
    }

    if (isCatalogBootstrap && telemetry !== null) {
      return (
        <PageShell
          badges={genreBadges}
          title={`Is ${gameName} Down?`}
          subtitle={`See if ${gameName} servers are up and read the latest game news.`}
          coverUrl={coverUrl}
          coverAlt={gameName}
        >
          <GameStatusSubNav
            slug={slug}
            hasNews={hasNews}
            hasMedia={hasMedia}
          />
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,360px)]">
            <div className="space-y-8">
              <section aria-labelledby="server-status-heading">
                <h2
                  id="server-status-heading"
                  className="heading-section mb-2 text-2xl uppercase text-white"
                >
                  Live Server Report
                </h2>
                <TelemetryRefreshBanner gameSlug={slug} />
                <p className="mb-6 text-sm leading-6 text-slate-400">
                  Live status data compiled from official game status pages and
                  player networks.
                </p>
                <GameTelemetryCard
                  telemetry={telemetry}
                  linkToStatusPage={false}
                  linkToProfile={false}
                  platforms={releasePlatforms}
                  serverStatusPending
                />
              </section>
            </div>

            <div className="space-y-8">
              {steamAppId ? (
                <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
              ) : null}
              <GameExternalLinks links={externalLinks} />
              <GameMediaSidebar gameName={gameName} gameSlug={slug} media={gameMedia} />
              <NewsFeedPanel
                news={news}
                fillHeight
                gameSlug={slug}
                sectionTitle="Game News & Updates"
                eyebrow="Latest Alerts"
              />
            </div>
          </div>
        </PageShell>
      );
    }

    if (telemetry === null) {
      notFound();
    }

    const faqItems = buildGameStatusFaq({
      gameName,
      status: telemetry.status,
      lastChecked: telemetry.lastChecked,
      livePlayers: telemetry.livePlayers,
      twitchViewers: telemetry.twitchViewers,
      incidentCount: incidents.length,
      firstMonitoredAt,
    });

    const showIndexableContent = telemetry.isIndexable === true;

    const jsonLd = buildStatusPageJsonLd({
      gameSlug: slug,
      status: telemetry.status,
      lastChecked: telemetry.lastChecked,
      pageUrl,
      siteUrl,
      incidentCount: incidents.length,
      faqItems: showIndexableContent ? faqItems : undefined,
    });

    const pageTitle = isCatalogProfile
      ? gameName
      : `Is ${gameName} Down?`;
    const pageSubtitle = isCatalogProfile
      ? `Live Twitch audience, IGDB ratings, trailers, and news for ${gameName}.`
      : buildStatusPageSubtitle(gameName, telemetry.status);
    const reportHeading = isCatalogProfile ? "Live Audience" : "Live Server Report";
    const reportDescription = isCatalogProfile
      ? "We track Twitch viewership and catalog data for this title. Server uptime is not monitored because it is not available on Steam or a supported probe."
      : "Live status data compiled from official game status pages and player networks.";

    return (
      <>
        {!isCatalogProfile ? (
          <JsonLdScript data={jsonLd} />
        ) : null}

        <PageShell
          badges={genreBadges}
          title={pageTitle}
          subtitle={pageSubtitle}
          coverUrl={coverUrl}
          coverAlt={gameName}
        >
          <GameStatusSubNav
            slug={slug}
            hasNews={hasNews}
            hasMedia={hasMedia}
          />
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,360px)]">
            <div className="space-y-8">
              <section aria-labelledby="server-status-heading">
                <h2
                  id="server-status-heading"
                  className="heading-section mb-2 text-2xl uppercase text-white"
                >
                  {reportHeading}
                </h2>
                <p className="mb-6 text-sm leading-6 text-slate-400">
                  {reportDescription}
                </p>
                <GameTelemetryCard
                  telemetry={telemetry}
                  linkToStatusPage={false}
                  linkToProfile={false}
                  history={isCatalogProfile ? [] : history}
                  platforms={releasePlatforms}
                  catalogOnly={isCatalogProfile}
                />
                <div className="mt-8">
                  <AdSlot format="leaderboard" slotId={`status-${slug}-leaderboard`} />
                </div>
              </section>

              {!isCatalogProfile && showIndexableContent ? (
                <GameStatusFaq items={faqItems} />
              ) : null}

              {!isCatalogProfile && showIndexableContent ? (
                <IncidentLog
                  incidents={incidents}
                  sectionTitle="Recent Problems"
                  eyebrow="Crash & Maintenance Log"
                />
              ) : null}
            </div>

            <div className="space-y-8">
              {steamAppId ? (
                <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
              ) : null}
              <GameExternalLinks links={externalLinks} />
              <GameMediaSidebar gameName={gameName} gameSlug={slug} media={gameMedia} />
              <NewsFeedPanel
                news={news}
                fillHeight
                gameSlug={slug}
                sectionTitle="Game News & Updates"
                eyebrow="Latest Alerts"
              />
              <AdSlot
                format="skyscraper"
                slotId={`status-${slug}-skyscraper`}
                className="sticky top-24"
              />
            </div>
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

function isUnreleasedGame(telemetry: GameTelemetry | null): boolean {
  if (!telemetry) {
    return false;
  }

  if (telemetry.status === "UPCOMING" || telemetry.isUpcoming === true) {
    return true;
  }

  const now = Date.now();
  const futureDates = [telemetry.releaseDate, telemetry.steamReleaseDate]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((timestamp) => Number.isFinite(timestamp));

  return futureDates.some((timestamp) => timestamp > now);
}
