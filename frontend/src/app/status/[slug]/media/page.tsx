import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Clapperboard, ExternalLink } from "lucide-react";
import GameScreenshotGallery from "@/components/GameScreenshotGallery";
import GameTrailerGrid from "@/components/GameTrailerGrid";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";
import { resolveGameDisplayName } from "@/lib/gameAssets";
import { hasGameMedia, resolveGameMedia } from "@/lib/gameMedia";
import { buildNoindexFollowRobots } from "@/lib/seo/indexability";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { getUpcomingReleaseBySlug } from "@/services/releasesService";
import { getGameStatusDetail } from "@/services/telemetryService";
import type { GameTelemetry } from "@/types/telemetry";

export const revalidate = 60;

interface GameMediaPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: GameMediaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  return {
    title: `${resolveGameDisplayName(canonicalSlug)} Trailers & Screenshots | StatusTimer`,
    description: `Official trailers, gameplay videos, and screenshots.`,
    robots: buildNoindexFollowRobots(),
  };
}

export default async function GameMediaPage({ params }: GameMediaPageProps) {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  if (canonicalSlug !== slug) {
    redirect(APP_ROUTES.gameMedia(canonicalSlug));
  }

  const [detail, release] = await Promise.all([
    getGameStatusDetail(canonicalSlug).catch(() => null),
    getUpcomingReleaseBySlug(canonicalSlug).catch(() => null),
  ]);

  if (!detail && !release) {
    notFound();
  }

  const gameName =
    detail?.gameName ??
    detail?.telemetry?.gameName ??
    release?.gameName ??
    resolveGameDisplayName(canonicalSlug, detail?.telemetry ?? undefined);

  const media = resolveGameMedia(
    detail
      ? {
          screenshotUrls: detail.screenshotUrls,
          trailerVideoIds: detail.trailerVideoIds,
          youtubeChannelUrl: detail.youtubeChannelUrl,
        }
      : null,
    release,
    detail?.telemetry,
  );

  if (!hasGameMedia(media)) {
    notFound();
  }

  const trailers = media.trailerVideoIds ?? [];
  const screenshots = media.screenshotUrls ?? [];
  const youtubeChannelUrl = media.youtubeChannelUrl?.trim() || null;
  const hasNews = (detail?.news?.length ?? 0) > 0;
  const linkToRelease = Boolean(
    release && (!detail || isUnreleasedGame(detail.telemetry)),
  );
  const backHref = linkToRelease
    ? APP_ROUTES.release(canonicalSlug)
    : APP_ROUTES.status(canonicalSlug);
  const backLabel = linkToRelease
    ? `Back to ${gameName} release page`
    : `Back to ${gameName} server status`;

  return (
    <PageShell
      badge="Game Media"
      title={`${gameName} Media`}
      subtitle={`Trailers, gameplay videos, and screenshots for ${gameName}.`}
    >
      <GameStatusSubNav slug={canonicalSlug} hasNews={hasNews} hasMedia />
      <div className="space-y-10">
        {youtubeChannelUrl ? (
          <section className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-violet-200/70">
                  Official channel
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">YouTube</h2>
              </div>
              <a
                href={youtubeChannelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-100 transition hover:border-violet-300/40 hover:bg-violet-500/15"
              >
                Visit channel
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </section>
        ) : null}

        {trailers.length > 0 ? (
          <section id="videos" className="scroll-mt-24">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-2.5">
                <Clapperboard className="h-4 w-4 text-violet-300" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-violet-200/70">
                  Videos
                </p>
                <h2 className="text-base font-semibold text-white">
                  {trailers.length === 1 ? "Trailer" : `${trailers.length} Trailers`}
                </h2>
              </div>
            </div>
            <GameTrailerGrid videoIds={trailers} gameName={gameName} />
          </section>
        ) : null}

        {screenshots.length > 0 ? (
          <section id="screenshots" className="scroll-mt-24">
            <div className="mb-4">
              <p className="text-[10px] uppercase tracking-[0.28em] text-violet-200/70">
                Gallery
              </p>
              <h2 className="text-base font-semibold text-white">
                {screenshots.length === 1
                  ? "Screenshot"
                  : `${screenshots.length} Screenshots`}
              </h2>
            </div>
            <GameScreenshotGallery
              screenshots={screenshots}
              gameName={gameName}
              maxVisible={screenshots.length}
            />
          </section>
        ) : null}
      </div>

      <p className="mt-8 text-center text-xs text-slate-400">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 transition hover:text-violet-200/70"
        >
          {backLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </p>
    </PageShell>
  );
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
