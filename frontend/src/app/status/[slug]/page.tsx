import { notFound, redirect } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import PendingTelemetryGate from "@/components/dashboard/telemetry/PendingTelemetryGate";
import TelemetryRefreshBanner from "@/components/dashboard/telemetry/TelemetryRefreshBanner";
import SteamStoreWidget from "@/components/dashboard/SteamStoreWidget";
import GameExternalLinks from "@/components/GameExternalLinks";
import ReleaseMediaPanel from "@/components/ReleaseMediaPanel";
import ReleaseNewsPanel from "@/components/ReleaseNewsPanel";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import PageShell from "@/components/PageShell";
import GameStatusFaq from "@/components/seo/GameStatusFaq";
import JsonLdScript from "@/components/seo/JsonLdScript";
import GameAssetImage from "@/components/ui/GameAssetImage";
import { APP_ROUTES, TRACKED_GAME_SLUGS } from "@/config/routes";
import {
  resolveGameDisplayName,
  resolveGameBoxArtUrl,
} from "@/lib/gameAssets";
import { resolveStatusPageHeroUrl } from "@/lib/statusHero";
import { buildGameStatusFaq } from "@/lib/seo/gameFaq";
import { buildStatusPageJsonLd } from "@/lib/seo/jsonLd";
import { buildStatusPageMetadata } from "@/lib/seo/metadata";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { isUpcomingGameTelemetry } from "@/lib/gameLifecycle";
import { isSinglePlayerGame } from "@/lib/gameType";
import { resolveGenres } from "@/lib/genres";
import { hasGameMedia, resolveGameMedia } from "@/lib/gameMedia";
import { getConfirmedPlatforms, resolveReleaseBoxArtUrl } from "@/lib/releases";
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
    const coverUrl = resolveStatusPageHeroUrl(slug, telemetry);
    const boxArtUrl =
      resolveGameBoxArtUrl(slug, telemetry ?? undefined) ??
      (releaseEntry ? resolveReleaseBoxArtUrl(slug, releaseEntry) : null);
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

    if (isUpcomingGameTelemetry(telemetry)) {
      redirect(APP_ROUTES.release(canonicalSlug));
    }

    const isCatalogProfile = catalogOnly === true;
    const isSinglePlayerProfile = isSinglePlayerGame(telemetry);
    const isPendingTelemetry = !telemetryReady && !isCatalogProfile && !isSinglePlayerProfile;
    const hasPartialTelemetry = telemetry !== null;
    const isInitialProbe = isPendingTelemetry && !hasPartialTelemetry;
    const isCatalogBootstrap = isPendingTelemetry && hasPartialTelemetry;

    if (isInitialProbe) {
      return (
        <PageShell
          title=""
          customHeader={
            <div className="flex items-start gap-4 md:gap-5">
              <GameAssetImage
                name={gameName}
                src={boxArtUrl}
                className="h-24 w-16 rounded-xl md:h-28 md:w-20"
                imageClassName="object-cover"
              />
              <div className="min-w-0">
                {genreBadges.length > 0 ? (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {genreBadges.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-200"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : null}
                <h1 className="heading-display text-3xl uppercase text-white md:text-4xl">
                  Is {gameName} Down?
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  We&apos;re checking {gameName} servers right now. It may take a few
                  minutes.
                </p>
              </div>
            </div>
          }
          coverUrl={coverUrl}
          coverAlt={gameName}
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
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

              <ReleaseNewsPanel
                news={news}
                gameName={gameName}
                gameSlug={slug}
              />
              <ReleaseMediaPanel
                gameName={gameName}
                media={gameMedia}
                gameSlug={canonicalSlug}
              />
            </div>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <GameStatusSubNav
                slug={slug}
                layout="sidebar"
                hasNews={hasNews}
                hasMedia={hasMedia}
              />
              {steamAppId ? (
                <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
              ) : null}
              <GameExternalLinks links={externalLinks} />
            </aside>
          </div>
        </PageShell>
      );
    }

    if (isCatalogBootstrap && telemetry !== null) {
      return (
        <PageShell
          title=""
          customHeader={
            <div className="flex items-start gap-4 md:gap-5">
              <GameAssetImage
                name={gameName}
                src={boxArtUrl}
                className="h-24 w-16 rounded-xl md:h-28 md:w-20"
                imageClassName="object-cover"
              />
              <div className="min-w-0">
                {genreBadges.length > 0 ? (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {genreBadges.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-200"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : null}
                <h1 className="heading-display text-3xl uppercase text-white md:text-4xl">
                  Is {gameName} Down?
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  See if {gameName} servers are up and read the latest game news.
                </p>
              </div>
            </div>
          }
          coverUrl={coverUrl}
          coverAlt={gameName}
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
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

              <ReleaseNewsPanel
                news={news}
                gameName={gameName}
                gameSlug={slug}
              />
              <ReleaseMediaPanel
                gameName={gameName}
                media={gameMedia}
                gameSlug={canonicalSlug}
              />
            </div>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <GameStatusSubNav
                slug={slug}
                layout="sidebar"
                hasNews={hasNews}
                hasMedia={hasMedia}
              />
              {steamAppId ? (
                <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
              ) : null}
              <GameExternalLinks links={externalLinks} />
            </aside>
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

    const pageTitle = isCatalogProfile || isSinglePlayerProfile
      ? gameName
      : `Is ${gameName} Down?`;
    const pageSubtitle = isCatalogProfile
      ? `Live Twitch audience, IGDB ratings, trailers, and news for ${gameName}.`
      : isSinglePlayerProfile
        ? `Latest news and live audience data for ${gameName}.`
        : buildStatusPageSubtitle(gameName, telemetry.status);
    const reportHeading = isCatalogProfile
      ? "Live Audience"
      : "Live Server Report";
    const reportDescription = isCatalogProfile
      ? "We track Twitch viewership and catalog data for this title. Server uptime is not monitored because it is not available on Steam or a supported probe."
      : "Live status data compiled from official game status pages and player networks.";
    const showReportIntro = !isSinglePlayerProfile;

    return (
      <>
        {!isCatalogProfile ? (
          <JsonLdScript data={jsonLd} />
        ) : null}

        <PageShell
          title=""
          customHeader={
            <div className="flex items-start gap-4 md:gap-5">
              <GameAssetImage
                name={gameName}
                src={boxArtUrl}
                className="h-24 w-16 rounded-xl md:h-28 md:w-20"
                imageClassName="object-cover"
              />
              <div className="min-w-0">
                {genreBadges.length > 0 ? (
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {genreBadges.map((genre) => (
                      <span
                        key={genre}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] text-slate-200"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : null}
                <h1 className="heading-display text-3xl uppercase text-white md:text-4xl">
                  {pageTitle}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                  {pageSubtitle}
                </p>
              </div>
            </div>
          }
          coverUrl={coverUrl}
          coverAlt={gameName}
        >
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-8">
              {!isCatalogProfile && !isSinglePlayerProfile && showIndexableContent ? (
                <GameStatusFaq items={faqItems} />
              ) : null}

              {!isCatalogProfile && !isSinglePlayerProfile && showIndexableContent ? (
                <IncidentLog
                  incidents={incidents}
                  sectionTitle="Recent Problems"
                  eyebrow="Crash & Maintenance Log"
                />
              ) : null}

              <ReleaseNewsPanel
                news={news}
                gameName={gameName}
                gameSlug={slug}
              />

              <ReleaseMediaPanel
                gameName={gameName}
                media={gameMedia}
                gameSlug={canonicalSlug}
              />

              <div className="mt-8">
                <AdSlot format="leaderboard" slotId={`status-${slug}-leaderboard`} />
              </div>
            </div>

            <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
              <GameStatusSubNav
                slug={slug}
                layout="sidebar"
                hasNews={hasNews}
                hasMedia={hasMedia}
              />
              <section aria-labelledby="server-status-heading" className="glass-panel rounded-3xl p-6">
                {showReportIntro ? (
                  <>
                    <h2
                      id="server-status-heading"
                      className="heading-section mb-2 text-2xl uppercase text-white"
                    >
                      {reportHeading}
                    </h2>
                    <p className="mb-6 text-sm leading-6 text-slate-400">
                      {reportDescription}
                    </p>
                  </>
                ) : (
                  <h2 id="server-status-heading" className="sr-only">
                    {gameName} overview
                  </h2>
                )}
                <GameTelemetryCard
                  telemetry={telemetry}
                  linkToStatusPage={false}
                  linkToProfile={false}
                  history={isCatalogProfile || isSinglePlayerProfile ? [] : history}
                  platforms={releasePlatforms}
                  catalogOnly={isCatalogProfile}
                  timelineLegendLayout="stacked"
                />
              </section>
              {steamAppId ? (
                <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
              ) : null}
              <GameExternalLinks links={externalLinks} />
              <AdSlot format="skyscraper" slotId={`status-${slug}-skyscraper`} />
            </aside>
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
