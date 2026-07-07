import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  FileText,
} from "lucide-react";
import HypeCounterButton from "@/components/HypeCounterButton";
import ReleaseMediaGallery from "@/components/ReleaseMediaGallery";
import PageShell from "@/components/PageShell";
import PlatformBadge from "@/components/ui/PlatformBadge";
import PlatformReleaseSchedule from "@/components/PlatformReleaseSchedule";
import DashboardError from "@/components/dashboard/DashboardError";
import {
  formatIgdbRating,
  resolveCatalogImageUrl,
  resolveGameCoverUrl,
} from "@/lib/gameAssets";
import { getConfirmedPlatforms } from "@/lib/releases";
import { toSlug } from "@/lib/slug";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import type { GamingNews, UpcomingRelease } from "@/types/api";
import GameAssetImage from "@/components/ui/GameAssetImage";

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

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
    const [releases, news] =
      await Promise.all([
      getUpcomingReleases(),
      getGamingNews(),
    ]);

    const release = findReleaseBySlug(releases, slug);

    if (!release) {
      notFound();
    }

    const gameNews = filterNewsForGame(news, slug);
    const coverUrl = resolveGameCoverUrl(slug, {
      coverUrl: release.imageUrl ?? undefined,
    });
    const confirmedPlatforms = getConfirmedPlatforms(release.platforms);
    const userRating = formatIgdbRating(release.userRating ?? null);
    const criticRating = formatIgdbRating(release.criticRating ?? null);

    return (
      <PageShell
        badge="Release Profile"
        title={release.gameName}
        subtitle={`${release.genre} · launch windows and latest game updates`}
        coverUrl={coverUrl}
        coverAlt={release.gameName}
      >
        <section className="glass-panel glow-ring mb-8 rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            {confirmedPlatforms.map((entry) => (
              <PlatformBadge
                key={entry.platform}
                platform={entry.platform}
                releaseDate={entry.releaseDate}
              />
            ))}
          </div>

          <div className="mt-8 max-w-2xl">
            <PlatformReleaseSchedule platforms={release.platforms} />
          </div>

          {(userRating || criticRating) && (
            <div className="mt-6 flex flex-wrap gap-2">
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

          <div className="mt-6 max-w-sm">
            <HypeCounterButton
              releaseId={release.id}
              initialHypeCount={release.hypeCount}
            />
          </div>
        </section>

        {(release.trailerVideoIds?.length ?? 0) > 0 ||
        (release.screenshotUrls?.length ?? 0) > 0 ? (
          <section className="glass-panel mb-8 rounded-3xl p-6 md:p-8">
            <ReleaseMediaGallery release={release} />
          </section>
        ) : null}

        <section className="glass-panel rounded-3xl p-6 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-3">
              <FileText className="h-5 w-5 text-fuchsia-300" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300/70">
                Latest updates
              </p>
              <h2 className="heading-section text-2xl uppercase text-white">
                NEWS & PATCH NOTES
              </h2>
            </div>
          </div>

          {gameNews.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-fuchsia-400/20 px-4 py-10 text-center text-sm text-slate-400">
              No new patches detected for this game yet. Check back soon for updates.
            </p>
          ) : (
            <div className="space-y-4">
              {gameNews.map((article) => (
                <Link
                  key={article.id}
                  href={`/news/${article.slug}`}
                  className="block"
                >
                  <article className="rounded-2xl border border-white/5 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]">
                    <div className="mb-3 flex items-start gap-4">
                      <GameAssetImage
                        name={article.gameTag}
                        src={resolveCatalogImageUrl(
                          article.gameCoverUrl ?? null,
                          null,
                        )}
                        className="h-16 w-14"
                        imageClassName="object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-fuchsia-200/70">
                          {article.gameTag}
                        </p>
                        <h3 className="mb-3 text-lg font-semibold text-white">
                          {article.title}
                        </h3>
                      </div>
                    </div>

                    <p className="text-sm leading-7 text-slate-300">
                      {article.content}
                    </p>
                    <time
                      dateTime={article.createdAt}
                      className="mt-4 block text-xs text-slate-400"
                    >
                      {formatTimestamp(article.createdAt)}
                    </time>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          <Link href="/" className="transition hover:text-violet-200/70">
            Return to monitor
          </Link>
          {" · "}
          <Link
            href="/intel"
            className="transition hover:text-violet-200/70"
          >
            View all news & patches
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
