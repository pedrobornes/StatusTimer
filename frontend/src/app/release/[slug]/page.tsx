import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Newspaper } from "lucide-react";
import { APP_ROUTES } from "@/config/routes";
import GameExternalLinks from "@/components/GameExternalLinks";
import GameAssetImage from "@/components/ui/GameAssetImage";
import GenreBadge from "@/components/ui/GenreBadge";
import HypeCounterButton from "@/components/HypeCounterButton";
import ReleaseCountdownPanel from "@/components/ReleaseCountdownPanel";
import ReleaseMediaPanel from "@/components/ReleaseMediaPanel";
import ReleaseNewsPanel from "@/components/ReleaseNewsPanel";
import SteamStoreWidget from "@/components/dashboard/SteamStoreWidget";
import PageShell from "@/components/PageShell";
import DashboardError from "@/components/dashboard/DashboardError";
import JsonLdScript from "@/components/seo/JsonLdScript";
import { formatIgdbRating, resolveGameDisplayName } from "@/lib/gameAssets";
import { resolveReleaseGenres } from "@/lib/genres";
import { resolveGameMedia } from "@/lib/gameMedia";
import { resolveReleaseBoxArtUrl, resolveReleaseHeroUrl } from "@/lib/releases";
import { redirectLaunchedReleaseToStatus } from "@/lib/releaseRoutes";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { toSlug } from "@/lib/slug";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleaseBySlug, getUpcomingReleases } from "@/services/releasesService";
import {
  getGameStatusDetail,
  getGameTelemetryBySlug,
} from "@/services/telemetryService";
import { buildReleasePageMetadata } from "@/lib/seo/releaseMetadata";
import { buildReleasePageJsonLd } from "@/lib/seo/jsonLd";
import type { GameExternalLinks as GameExternalLinksMap } from "@/lib/gamePlatformLinks";
import type { GamingNews, UpcomingRelease } from "@/types/api";

export const revalidate = 60;

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

interface ReleasePageProps {
  params: Promise<{ slug: string }>;
}

function findReleaseBySlug(
  releases: UpcomingRelease[],
  slug: string,
): UpcomingRelease | undefined {
  return releases.find((release) => release.slug === slug);
}

function filterNewsForGame(news: GamingNews[], slug: string): GamingNews[] {
  return news.filter(
    (article) =>
      toSlug(article.gameTag) === slug ||
      article.gameTag.toLowerCase().includes(slug.replace(/-/g, " ")),
  );
}

function resolveSteamAppId(
  release: UpcomingRelease,
  telemetryAppId?: number | null,
): number | null {
  if (release.steamAppId && release.steamAppId > 0) {
    return release.steamAppId;
  }

  if (telemetryAppId && telemetryAppId > 0) {
    return telemetryAppId;
  }

  return null;
}

export async function generateMetadata({
  params,
}: ReleasePageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  try {
    const releases = await getUpcomingReleases();
    const release = findReleaseBySlug(releases, canonicalSlug);

    if (!release) {
      const statusDetail = await getGameStatusDetail(canonicalSlug).catch(
        () => null,
      );
      const gameName =
        statusDetail?.telemetry?.gameName ??
        statusDetail?.gameName ??
        resolveGameDisplayName(canonicalSlug);

      return {
        title: `${gameName} Server Status`,
        description: `Live server status, outages, and patch notes for ${gameName}.`,
      };
    }

    return buildReleasePageMetadata(release);
  } catch {
    return { title: "Release Profile" };
  }
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  try {
    const [releases, news, telemetry, statusDetail] = await Promise.all([
      getUpcomingReleases(),
      getGamingNews(),
      getGameTelemetryBySlug(canonicalSlug).catch(() => null),
      getGameStatusDetail(canonicalSlug).catch(() => null),
    ]);

    const release =
      findReleaseBySlug(releases, canonicalSlug) ??
      (await getUpcomingReleaseBySlug(canonicalSlug).catch(() => null));

    if (!release) {
      redirectLaunchedReleaseToStatus(canonicalSlug);
    }

    const gameNews = filterNewsForGame(news, canonicalSlug);
    const coverUrl = resolveReleaseHeroUrl(canonicalSlug, release);
    const boxArtUrl = resolveReleaseBoxArtUrl(canonicalSlug, release);
    const userRating = formatIgdbRating(release.userRating ?? null);
    const criticRating = formatIgdbRating(release.criticRating ?? null);
    const steamAppId = resolveSteamAppId(release, telemetry?.appId);
    const gameMedia = resolveGameMedia(
      release,
      telemetry,
      statusDetail
        ? {
            screenshotUrls: statusDetail.screenshotUrls,
            trailerVideoIds: statusDetail.trailerVideoIds,
            youtubeChannelUrl: statusDetail.youtubeChannelUrl,
          }
        : null,
    );
    const externalLinks = statusDetail?.externalLinks as
      | GameExternalLinksMap
      | undefined;
    const genreBadges = resolveReleaseGenres(release);
    const pageUrl = `${siteUrl}${APP_ROUTES.release(canonicalSlug)}`;
    const releaseJsonLd = buildReleasePageJsonLd({
      gameName: release.gameName,
      releaseDate: release.releaseDate,
      pageUrl,
      siteUrl,
      platforms: release.platforms.map((entry) => entry.platform),
    });

    return (
      <>
        <JsonLdScript data={releaseJsonLd} />
        <PageShell
        title={release.gameName}
        customHeader={
          <div className="flex items-start gap-4 md:gap-5">
            <GameAssetImage
              name={release.gameName}
              src={boxArtUrl}
              className="h-24 w-16 rounded-xl md:h-28 md:w-20"
              imageClassName="object-cover"
            />

            <div className="min-w-0">
              {genreBadges.length > 0 ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {genreBadges.map((genre) => (
                    <GenreBadge key={genre} label={genre} />
                  ))}
                </div>
              ) : null}

              <h1 className="heading-display text-3xl uppercase text-white md:text-4xl">
                {release.gameName}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                Launch windows, countdown, trailers, and patch notes for {release.gameName}.
              </p>
            </div>
          </div>
        }
        coverUrl={coverUrl}
        coverAlt={release.gameName}
      >
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <ReleaseNewsPanel
              news={gameNews}
              gameName={release.gameName}
              gameSlug={canonicalSlug}
              newsIndexHref={APP_ROUTES.releaseNews(canonicalSlug)}
            />

            <ReleaseMediaPanel
              gameName={release.gameName}
              media={gameMedia}
              gameSlug={canonicalSlug}
            />
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <ReleaseCountdownPanel
              platforms={release.platforms}
              fallbackReleaseDate={release.releaseDate}
              userRating={userRating}
              criticRating={criticRating}
            />

            {steamAppId ? (
              <SteamStoreWidget
                steamAppId={steamAppId}
                gameName={release.gameName}
              />
            ) : null}

            <section className="glass-panel rounded-3xl p-5">
              <HypeCounterButton
                releaseId={release.id}
                initialHypeCount={release.hypeCount}
              />
            </section>

            <GameExternalLinks links={externalLinks} />
          </aside>
        </div>

        <nav className="mt-10 flex flex-col items-center justify-center gap-3 border-t border-white/8 pt-6 sm:flex-row sm:gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-violet-100"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Return to monitor
          </Link>
          {gameNews.length > 0 ? (
            <Link
              href={APP_ROUTES.releaseNews(canonicalSlug)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-fuchsia-400/30 hover:bg-fuchsia-500/10 hover:text-fuchsia-100"
            >
              <Newspaper className="h-4 w-4" aria-hidden />
              View all {release.gameName} news &amp; patches
            </Link>
          ) : null}
        </nav>
      </PageShell>
      </>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load release profile from the backend.";

    return <DashboardError message={message} />;
  }
}
