import { notFound, redirect } from "next/navigation";
import AdSlot from "@/components/ads/AdSlot";
import GameTelemetryCard from "@/components/dashboard/GameTelemetryCard";
import IncidentLog from "@/components/dashboard/telemetry/IncidentLog";
import PendingTelemetryGate from "@/components/dashboard/telemetry/PendingTelemetryGate";
import TelemetryRefreshBanner from "@/components/dashboard/telemetry/TelemetryRefreshBanner";
import SteamStoreWidget from "@/components/dashboard/SteamStoreWidget";
import GameExternalLinks from "@/components/GameExternalLinks";
import ReleaseMediaPanel from "@/components/ReleaseMediaPanel";
import NewsFeedPanel from "@/components/dashboard/NewsFeedPanel";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import GamePageLayout from "@/components/GamePageLayout";
import PageShell from "@/components/PageShell";
import GameStatusFaq from "@/components/seo/GameStatusFaq";
import JsonLdScript from "@/components/seo/JsonLdScript";
import GameAssetImage from "@/components/ui/GameAssetImage";
import { APP_ROUTES, TRACKED_GAME_SLUGS } from "@/config/routes";
import { getSiteUrl } from "@/config/site";
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

export const revalidate = 600;

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

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}${APP_ROUTES.status(slug)}`;

  try {
    const [
      {
        gameName: catalogGameName,
        telemetry,
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
      getGameStatusDetail(slug, { revalidate: 600 }),
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
          <GamePageLayout
            subNav={
              <GameStatusSubNav
                slug={slug}
                hasNews={hasNews}
                hasMedia={hasMedia}
              />
            }
            priority={
              <>
                <section
                  aria-labelledby="server-status-heading"
                  className="min-w-0 max-w-full overflow-hidden"
                >
                  <h2 id="server-status-heading" className="sr-only">
                    {gameName} server status
                  </h2>
                  <PendingTelemetryGate gameSlug={slug} />
                  {hasPartialTelemetry ? (
                    <GameTelemetryCard
                      telemetry={telemetry}
                      linkToStatusPage={false}
                      linkToProfile={false}
                      platforms={releasePlatforms}
                      serverStatusPending
                      embedded
                    />
                  ) : null}
                </section>
                {steamAppId ? (
                  <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
                ) : null}
                <GameExternalLinks links={externalLinks} />
              </>
            }
            content={
              <>
                {hasNews ? (
                  <NewsFeedPanel
                    news={news}
                    gameSlug={slug}
                    sectionTitle="News & Patch Notes"
                    eyebrow="Latest updates"
                  />
                ) : null}
                <ReleaseMediaPanel
                  gameName={gameName}
                  media={gameMedia}
                  gameSlug={canonicalSlug}
                />
              </>
            }
          />
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
          <GamePageLayout
            subNav={
              <GameStatusSubNav
                slug={slug}
                hasNews={hasNews}
                hasMedia={hasMedia}
              />
            }
            priority={
              <>
                <section
                  aria-labelledby="server-status-heading"
                  className="min-w-0 max-w-full overflow-hidden"
                >
                  <h2 id="server-status-heading" className="sr-only">
                    {gameName} server status
                  </h2>
                  <TelemetryRefreshBanner gameSlug={slug} />
                  <GameTelemetryCard
                    telemetry={telemetry}
                    linkToStatusPage={false}
                    linkToProfile={false}
                    platforms={releasePlatforms}
                    serverStatusPending
                    embedded
                  />
                </section>
                {steamAppId ? (
                  <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
                ) : null}
                <GameExternalLinks links={externalLinks} />
              </>
            }
            content={
              <>
                {hasNews ? (
                  <NewsFeedPanel
                    news={news}
                    gameSlug={slug}
                    sectionTitle="News & Patch Notes"
                    eyebrow="Latest updates"
                  />
                ) : null}
                <ReleaseMediaPanel
                  gameName={gameName}
                  media={gameMedia}
                  gameSlug={canonicalSlug}
                />
              </>
            }
          />
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
      gameName,
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
    const sidebarStatusLabel = isCatalogProfile
      ? `${gameName} live audience`
      : `${gameName} server status`;

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
          <GamePageLayout
            subNav={
              <GameStatusSubNav
                slug={slug}
                hasNews={hasNews}
                hasMedia={hasMedia}
              />
            }
            priority={
              <>
                <section
                  aria-labelledby="server-status-heading"
                  className="min-w-0 max-w-full overflow-hidden"
                >
                  <h2 id="server-status-heading" className="sr-only">
                    {sidebarStatusLabel}
                  </h2>
                  <GameTelemetryCard
                    telemetry={telemetry}
                    linkToStatusPage={false}
                    linkToProfile={false}
                    platforms={releasePlatforms}
                    catalogOnly={isCatalogProfile}
                    embedded
                  />
                </section>
                {steamAppId ? (
                  <SteamStoreWidget steamAppId={steamAppId} gameName={gameName} />
                ) : null}
                <GameExternalLinks links={externalLinks} />
                {!isCatalogProfile && !isSinglePlayerProfile && showIndexableContent ? (
                  <IncidentLog incidents={incidents} sidebar />
                ) : null}
                <AdSlot format="skyscraper" slotId={`status-${slug}-skyscraper`} />
              </>
            }
            content={
              <>
                {hasNews ? (
                  <NewsFeedPanel
                    news={news}
                    gameSlug={slug}
                    sectionTitle="News & Patch Notes"
                    eyebrow="Latest updates"
                  />
                ) : null}

                <ReleaseMediaPanel
                  gameName={gameName}
                  media={gameMedia}
                  gameSlug={canonicalSlug}
                />

                {!isCatalogProfile && !isSinglePlayerProfile && showIndexableContent ? (
                  <GameStatusFaq items={faqItems} />
                ) : null}

                <div className="mt-8">
                  <AdSlot format="leaderboard" slotId={`status-${slug}-leaderboard`} />
                </div>
              </>
            }
          />
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
