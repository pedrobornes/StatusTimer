import Link from "next/link";
import { ArrowRight, Clapperboard } from "lucide-react";
import GameScreenshotGallery from "@/components/GameScreenshotGallery";
import { APP_ROUTES } from "@/config/routes";
import { hasGameMedia } from "@/lib/gameMedia";

export interface GameMediaContent {
  screenshotUrls?: string[] | null;
  trailerVideoIds?: string[] | null;
  youtubeChannelUrl?: string | null;
}

interface GameMediaSidebarProps {
  gameName: string;
  gameSlug?: string;
  media: GameMediaContent;
}

export default function GameMediaSidebar({
  gameName,
  gameSlug,
  media,
}: GameMediaSidebarProps) {
  const trailerId = media.trailerVideoIds?.[0];
  const screenshots = media.screenshotUrls ?? [];
  const showViewAll = Boolean(gameSlug) && hasGameMedia(media);

  if (!trailerId && screenshots.length === 0) {
    return null;
  }

  return (
    <section className="glass-panel rounded-3xl p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-2.5">
          <Clapperboard className="h-4 w-4 text-violet-300" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-violet-200/70">
            Game media
          </p>
          <h2 className="text-base font-semibold text-white">Trailer & Screenshots</h2>
        </div>
      </div>

      <div className="space-y-4">
        {trailerId ? (
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
            <div className="aspect-video w-full">
              <iframe
                title={`${gameName} trailer`}
                src={`https://www.youtube.com/embed/${trailerId}`}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

        {screenshots.length > 0 ? (
          <GameScreenshotGallery
            screenshots={screenshots}
            gameName={gameName}
            compact
            maxVisible={6}
          />
        ) : null}
      </div>

      {showViewAll && gameSlug ? (
        <Link
          href={APP_ROUTES.gameMedia(gameSlug)}
          className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-violet-200/80 transition hover:text-violet-100"
        >
          View all media
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : null}
    </section>
  );
}
