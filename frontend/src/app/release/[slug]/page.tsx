import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Activity,
  CalendarClock,
  FileText,
  Radio,
} from "lucide-react";
import HypeCounterButton from "@/components/HypeCounterButton";
import ReleaseCountdown from "@/components/ReleaseCountdown";
import DashboardError from "@/components/DashboardError";
import { formatReleaseDate } from "@/lib/countdown";
import { toSlug } from "@/lib/slug";
import { getGamingNews } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getServerStatuses } from "@/services/statusService";
import type { GamingNews, ServerStatus, UpcomingRelease } from "@/types/api";

export const revalidate = 60;

const HOME_PREVIEW_LIMIT = 4;

interface ReleasePageProps {
  params: Promise<{ slug: string }>;
}

function findReleaseBySlug(
  releases: UpcomingRelease[],
  slug: string,
): UpcomingRelease | undefined {
  return releases.find((release) => toSlug(release.gameName) === slug);
}

function filterStatusesForGame(
  statuses: ServerStatus[],
  gameName: string,
): ServerStatus[] {
  const normalizedGame = gameName.toLowerCase();

  return statuses.filter((status) =>
    status.serviceName.toLowerCase().includes(normalizedGame),
  );
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
    const [releases, statuses, news] = await Promise.all([
      getUpcomingReleases(),
      getServerStatuses(),
      getGamingNews(),
    ]);

    const release = findReleaseBySlug(releases, slug);

    if (!release) {
      notFound();
    }

    const gameStatuses = filterStatusesForGame(statuses, release.gameName);
    const gameNews = filterNewsForGame(news, slug);

    return (
      <div className="mystery-grid min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
          <section className="glass-panel glow-ring mb-8 rounded-3xl p-6 md:p-8">
            <p className="mb-3 text-xs uppercase tracking-[0.35em] text-cyan-300/70">
              Release Profile
            </p>
            <h1 className="heading-display text-3xl uppercase text-white md:text-5xl">
              {release.gameName}
            </h1>
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300">
              <CalendarClock className="h-4 w-4 text-cyan-300/80" />
              <time dateTime={release.releaseDate}>
                Launch target: {formatReleaseDate(release.releaseDate)}
              </time>
            </p>

            <div className="mt-8 max-w-xl">
              <ReleaseCountdown releaseDate={release.releaseDate} />
            </div>

            <div className="mt-6 max-w-sm">
              <HypeCounterButton
                releaseId={release.id}
                initialHypeCount={release.hypeCount}
              />
            </div>
          </section>

          <section className="glass-panel mb-8 rounded-3xl p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
                <Activity className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-violet-300/70">
                  Server Status
                </p>
                <h2 className="heading-section text-2xl uppercase text-white">
                  LIVE SERVERS
                </h2>
              </div>
            </div>

            {gameStatuses.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-violet-400/20 px-4 py-6 text-sm text-slate-400">
                [SCANNING SERVERS] No server data linked to this game yet.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {gameStatuses.map((status) => (
                  <article
                    key={status.id}
                    className="rounded-2xl border border-white/5 bg-white/[0.03] p-5"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-white">
                        {status.serviceName}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          status.isUp
                            ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/20"
                            : "bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/20"
                        }`}
                      >
                        {status.isUp ? "Online" : "Offline"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Radio className="h-3.5 w-3.5" />
                      <time dateTime={status.lastChecked}>
                        Last checked {formatTimestamp(status.lastChecked)}
                      </time>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="glass-panel rounded-3xl p-6 md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-3">
                <FileText className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300/70">
                  Patch Log
                </p>
                <h2 className="heading-section text-2xl uppercase text-white">
                  PATCH NOTES
                </h2>
              </div>
            </div>

            {gameNews.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-fuchsia-400/20 px-4 py-10 text-center text-sm text-slate-400">
                [DECRYPTING] No new patches detected for this game yet. Standby
                for updates...
              </p>
            ) : (
              <div className="space-y-4">
                {gameNews.map((article) => (
                  <article
                    key={article.id}
                    className="rounded-2xl border border-white/5 bg-white/[0.03] p-5"
                  >
                    <p className="mb-2 text-xs uppercase tracking-[0.2em] text-fuchsia-200/70">
                      {article.gameTag}
                    </p>
                    <h3 className="mb-3 text-lg font-semibold text-white">
                      {article.title}
                    </h3>
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
        </div>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load release profile from the backend.";

    return <DashboardError message={message} />;
  }
}
