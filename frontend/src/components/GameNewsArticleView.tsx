import Link from "next/link";
import { Newspaper } from "lucide-react";
import GameStatusSubNav from "@/components/GameStatusSubNav";
import IntelFeedContent from "@/components/dashboard/IntelFeedContent";
import PageShell from "@/components/PageShell";
import GameAssetImage from "@/components/ui/GameAssetImage";
import LocalizedTime from "@/components/ui/LocalizedTime";
import type { NewsGameContext } from "@/lib/newsRoutes";
import {
  cleanNewsDisplayTitle,
  resolveNewsGameName,
} from "@/lib/intelFeed";
import { hasGameMedia, resolveGameMedia } from "@/lib/gameMedia";
import type { GamingNews } from "@/types/api";
import type { GameStatusDetail } from "@/types/telemetry";

interface GameNewsArticleViewProps {
  article: GamingNews;
  context: NewsGameContext;
  heroUrl?: string | null;
  boxArtUrl?: string | null;
  statusDetail?: GameStatusDetail | null;
}

export default function GameNewsArticleView({
  article,
  context,
  heroUrl = null,
  boxArtUrl = null,
  statusDetail = null,
}: GameNewsArticleViewProps) {
  const gameName = resolveNewsGameName(article);
  const displayTitle = cleanNewsDisplayTitle(article.title, article.gameTag);
  const hasMedia = statusDetail
    ? hasGameMedia(
        resolveGameMedia(
          {
            screenshotUrls: statusDetail.screenshotUrls,
            trailerVideoIds: statusDetail.trailerVideoIds,
            youtubeChannelUrl: statusDetail.youtubeChannelUrl,
          },
          statusDetail.telemetry,
        ),
      )
    : false;

  return (
    <PageShell
      badge="News & Patch Notes"
      title={displayTitle}
      coverUrl={heroUrl}
      coverAlt={gameName}
    >
      {context.isReleaseOnly ? (
        <GameStatusSubNav
          slug={context.gameSlug}
          variant="release"
          hasNews
          hasMedia={hasMedia}
        />
      ) : (
        <GameStatusSubNav
          slug={context.gameSlug}
          hasNews
          hasMedia={hasMedia}
        />
      )}

      <section className="glass-panel mb-6 rounded-3xl border border-white/16 bg-[#211b3a]/90 p-5 shadow-[0_18px_50px_rgba(5,3,12,0.34)] sm:p-6 md:p-8">
        <div className="mb-6 flex items-start gap-3 border-b border-white/10 pb-5 sm:gap-4 md:gap-5">
          <Link
            href={context.profileHref}
            className="shrink-0 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
            aria-label={`View ${gameName} profile`}
          >
            <GameAssetImage
              name={gameName}
              src={boxArtUrl}
              className="h-20 w-14 shrink-0 rounded-xl sm:h-24 sm:w-16 md:h-28 md:w-20"
              imageClassName="object-cover"
            />
          </Link>

          <div className="min-w-0 pt-1">
            <Link
              href={context.profileHref}
              className="text-lg font-semibold text-white transition hover:text-violet-100 md:text-xl"
            >
              {gameName}
            </Link>
            <LocalizedTime
              value={article.publishedAt ?? article.createdAt ?? ""}
              prefix="Published: "
              className="mt-2 block text-xs text-slate-400"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-5 md:p-6">
          <IntelFeedContent content={article.content} />
        </div>
      </section>

      <nav className="mt-10 flex justify-center border-t border-white/8 pt-6">
        <Link
          href={context.newsIndexHref}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-fuchsia-400/30 hover:bg-fuchsia-500/10 hover:text-fuchsia-100"
        >
          <Newspaper className="h-4 w-4" aria-hidden />
          View all {gameName} news
        </Link>
      </nav>
    </PageShell>
  );
}
