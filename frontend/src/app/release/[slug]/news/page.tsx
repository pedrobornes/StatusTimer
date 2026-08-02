import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import GameNewsIndexList from "@/components/GameNewsIndexList";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";
import { resolveGameDisplayName } from "@/lib/gameAssets";
import { hasGameMedia, resolveGameMedia } from "@/lib/gameMedia";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { resolveNewsGameName } from "@/lib/intelFeed";
import { buildNewsIndexMetadata } from "@/lib/seo/newsMetadata";
import { getGamingNewsByGame } from "@/services/newsService";
import { getUpcomingReleases } from "@/services/releasesService";
import { getGameStatusDetail } from "@/services/telemetryService";

export const revalidate = 1800;

interface ReleaseNewsIndexPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: ReleaseNewsIndexPageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);
  const gameName = resolveGameDisplayName(canonicalSlug);

  return buildNewsIndexMetadata({
    gameName,
    indexPath: APP_ROUTES.releaseNews(canonicalSlug),
    description: `Browse patch notes, updates, and developer announcements for ${gameName}.`,
  });
}

export default async function ReleaseNewsIndexPage({
  params,
  searchParams,
}: ReleaseNewsIndexPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  if (canonicalSlug !== slug) {
    redirect(APP_ROUTES.releaseNews(canonicalSlug));
  }

  const [news, releases, statusDetail] = await Promise.all([
    getGamingNewsByGame(canonicalSlug, 100).catch(() => null),
    getUpcomingReleases().catch(() => []),
    getGameStatusDetail(canonicalSlug).catch(() => null),
  ]);

  const release = releases.find((entry) => entry.slug === canonicalSlug);
  if (!release) {
    notFound();
  }

  if (!news || news.length === 0) {
    notFound();
  }

  const gameName = resolveNewsGameName(news[0]);
  const hasMedia = hasGameMedia(
    resolveGameMedia(
      release,
      statusDetail?.telemetry ?? null,
      statusDetail
        ? {
            screenshotUrls: statusDetail.screenshotUrls,
            trailerVideoIds: statusDetail.trailerVideoIds,
            youtubeChannelUrl: statusDetail.youtubeChannelUrl,
          }
        : null,
    ),
  );
  const currentPage = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  return (
    <PageShell
      badge="Game News"
      title={`${gameName} News`}
      subtitle={`Patch notes, updates, and developer announcements for ${gameName}.`}
    >
      <GameStatusSubNav
        slug={canonicalSlug}
        variant="release"
        hasNews
        hasMedia={hasMedia}
      />
      <GameNewsIndexList news={news} currentPage={currentPage} />

      <nav className="mt-10 flex justify-center border-t border-white/8 pt-6">
        <Link
          href={APP_ROUTES.release(canonicalSlug)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-violet-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Return to release profile
        </Link>
      </nav>
    </PageShell>
  );
}
