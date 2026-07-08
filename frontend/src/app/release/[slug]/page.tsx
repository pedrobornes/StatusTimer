import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { APP_ROUTES } from "@/config/routes";
import HypeCounterButton from "@/components/HypeCounterButton";
import GameMediaSidebar from "@/components/GameMediaSidebar";
import ReleaseNewsPanel from "@/components/ReleaseNewsPanel";
import SteamStoreWidget from "@/components/dashboard/SteamStoreWidget";
import PageShell from "@/components/PageShell";
import PlatformReleaseSchedule from "@/components/PlatformReleaseSchedule";
import DashboardError from "@/components/dashboard/DashboardError";
import { formatIgdbRating } from "@/lib/gameAssets";
import { resolveGameMedia } from "@/lib/gameMedia";
import { resolveReleaseHeroUrl } from "@/lib/releases";
import { toSlug } from "@/lib/slug";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getGameTelemetryBySlug } from "@/services/telemetryService";
import type { GamingNews, UpcomingRelease } from "@/types/api";

export const revalidate = 60;

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

  try {
    const releases = await getUpcomingReleases();
    const release = findReleaseBySlug(releases, slug);

    if (!release) {
      return { title: "Release Not Found" };
    }

    return {
      title: `${release.gameName} Release Profile`,
      description: `Live countdown, server status, and patch notes for ${release.gameName}.`,
    };
  } catch {
    return { title: "Release Profile" };
  }
}

export default async function ReleasePage({ params }: ReleasePageProps) {
  const { slug } = await params;

  try {
    const [releases, news, telemetry] = await Promise.all([
      getUpcomingReleases(),
      getGamingNews(),
      getGameTelemetryBySlug(slug).catch(() => null),
    ]);

    const release = findReleaseBySlug(releases, slug);

    if (!release) {
      notFound();
    }

    const gameNews = filterNewsForGame(news, slug);
    const coverUrl = resolveReleaseHeroUrl(slug, release);
    const userRating = formatIgdbRating(release.userRating ?? null);
    const criticRating = formatIgdbRating(release.criticRating ?? null);
    const steamAppId = resolveSteamAppId(release, telemetry?.appId);
    const gameMedia = resolveGameMedia(release, telemetry);

    return (
      <PageShell
        badge="Release Profile"
        title={release.gameName}
        subtitle={`${release.genre} · launch windows and latest game updates`}
        coverUrl={coverUrl}
        coverAlt={release.gameName}
        heroEmphasis
      >
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-8">
            <section className="glass-panel glow-ring max-w-4xl rounded-3xl p-5 md:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-2.5">
                  <CalendarClock className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/70">
                    Launch windows
                  </p>
                  <h2 className="text-lg font-semibold text-white">
                    Release Countdown
                  </h2>
                </div>
              </div>

              <PlatformReleaseSchedule
                platforms={release.platforms}
                layout="grid"
              />

              {(userRating || criticRating) && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {userRating ? (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                      Player score {userRating}
                    </span>
                  ) : null}
                  {criticRating ? (
                    <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-100">
                      Critic score {criticRating}
                    </span>
                  ) : null}
                </div>
              )}
            </section>

            <ReleaseNewsPanel
              news={gameNews}
              gameName={release.gameName}
              gameSlug={slug}
            />
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
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

            <GameMediaSidebar gameName={release.gameName} media={gameMedia} />
          </aside>
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          <Link href="/" className="transition hover:text-violet-200/70">
            Return to monitor
          </Link>
          {" · "}
          <Link
            href={APP_ROUTES.gameNews(slug)}
            className="transition hover:text-violet-200/70"
          >
            View all {release.gameName} news & patches
          </Link>
        </p>
      </PageShell>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load release profile from the backend.";

    return <DashboardError message={message} />;
  }
}
