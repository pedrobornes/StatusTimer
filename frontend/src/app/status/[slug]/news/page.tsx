import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import GameNewsIndexList from "@/components/GameNewsIndexList";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";
import { resolveGameDisplayName } from "@/lib/gameAssets";
import { resolveCanonicalGameSlug } from "@/lib/gameSlugs";
import { resolveNewsGameName } from "@/lib/intelFeed";
import { hasGameMedia, resolveGameMedia } from "@/lib/gameMedia";
import { buildNewsIndexMetadata } from "@/lib/seo/newsMetadata";
import { getGamingNewsByGame } from "@/services/newsService";
import { getGameStatusDetail } from "@/services/telemetryService";
import type { GameTelemetry } from "@/types/telemetry";

export const revalidate = 60;

interface GameNewsIndexPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({
  params,
}: GameNewsIndexPageProps): Promise<Metadata> {
  const { slug } = await params;
  const canonicalSlug = resolveCanonicalGameSlug(slug);
  const gameName = resolveGameDisplayName(canonicalSlug);

  return buildNewsIndexMetadata({
    gameName,
    indexPath: APP_ROUTES.gameNews(canonicalSlug),
    description: `Browse patch notes, updates, and developer announcements for ${gameName}.`,
  });
}

export default async function GameNewsIndexPage({
  params,
  searchParams,
}: GameNewsIndexPageProps) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const canonicalSlug = resolveCanonicalGameSlug(slug);

  if (canonicalSlug !== slug) {
    redirect(APP_ROUTES.gameNews(canonicalSlug));
  }

  const [news, detail] = await Promise.all([
    getGamingNewsByGame(canonicalSlug, 100).catch(() => null),
    getGameStatusDetail(canonicalSlug).catch(() => null),
  ]);

  if (isUnreleasedGame(detail?.telemetry ?? null)) {
    notFound();
  }

  if (!news || news.length === 0) {
    notFound();
  }

  const gameName = resolveNewsGameName(news[0]);
  const hasMedia = detail
    ? hasGameMedia(
        resolveGameMedia(
          {
            screenshotUrls: detail.screenshotUrls,
            trailerVideoIds: detail.trailerVideoIds,
            youtubeChannelUrl: detail.youtubeChannelUrl,
          },
          detail.telemetry,
        ),
      )
    : false;
  const currentPage = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  return (
    <PageShell
      badge="Game News"
      title={`${gameName} News`}
      subtitle={`Patch notes, updates, and developer announcements for ${gameName}.`}
    >
      <GameStatusSubNav slug={canonicalSlug} hasNews hasMedia={hasMedia} />
      <GameNewsIndexList news={news} currentPage={currentPage} />

      <nav className="mt-10 flex justify-center border-t border-white/8 pt-6">
        <Link
          href={APP_ROUTES.status(canonicalSlug)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-violet-400/30 hover:bg-violet-500/10 hover:text-violet-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Return to monitor
        </Link>
      </nav>
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
