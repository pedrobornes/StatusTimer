import { Clapperboard, ExternalLink } from "lucide-react";
import GameScreenshotGallery from "@/components/GameScreenshotGallery";
import GameTrailerGrid from "@/components/GameTrailerGrid";
import MediaViewMoreLink from "@/components/MediaViewMoreLink";
import type { GameMediaContent } from "@/components/GameMediaSidebar";
import {
  MEDIA_PREVIEW_MAX_SCREENSHOTS,
  MEDIA_PREVIEW_MAX_VIDEOS,
  buildGameMediaSectionHref,
  hasGameMedia,
} from "@/lib/gameMedia";

interface ReleaseMediaPanelProps {
  gameName: string;
  media: GameMediaContent;
  gameSlug?: string;
}

export default function ReleaseMediaPanel({
  gameName,
  media,
  gameSlug,
}: ReleaseMediaPanelProps) {
  if (!hasGameMedia(media)) {
    return null;
  }

  const trailers = media.trailerVideoIds ?? [];
  const screenshots = media.screenshotUrls ?? [];
  const youtubeChannelUrl = media.youtubeChannelUrl?.trim() || null;
  const showMediaLinks = Boolean(gameSlug?.trim());
  const hiddenVideoCount = Math.max(0, trailers.length - MEDIA_PREVIEW_MAX_VIDEOS);
  const hiddenScreenshotCount = Math.max(
    0,
    screenshots.length - MEDIA_PREVIEW_MAX_SCREENSHOTS,
  );

  return (
    <section className="glass-panel rounded-3xl p-5 sm:p-6 md:p-8">
      <div className="mb-6 flex min-w-0 items-center gap-3">
        <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
          <Clapperboard className="h-5 w-5 text-violet-300" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-violet-300/70">
            Game media
          </p>
          <h2 className="heading-section text-xl uppercase text-white sm:text-2xl">
            Trailers & Screenshots
          </h2>
        </div>
      </div>

      <div className="space-y-8">
        {youtubeChannelUrl ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <p className="text-sm text-slate-300">Official YouTube channel</p>
            <a
              href={youtubeChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-violet-200 transition hover:text-violet-100"
            >
              Visit channel
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        ) : null}

        {trailers.length > 0 ? (
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              {trailers.length === 1 ? "Trailer" : `${trailers.length} Trailers`}
            </p>
            <GameTrailerGrid
              videoIds={trailers}
              gameName={gameName}
              maxVisible={MEDIA_PREVIEW_MAX_VIDEOS}
            />
            {showMediaLinks && hiddenVideoCount > 0 ? (
              <MediaViewMoreLink
                href={buildGameMediaSectionHref(gameSlug!, "videos")}
                label={`View all ${trailers.length} videos`}
              />
            ) : null}
          </div>
        ) : null}

        {screenshots.length > 0 ? (
          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
              {screenshots.length === 1
                ? "Screenshot"
                : `${screenshots.length} Screenshots`}
            </p>
            <GameScreenshotGallery
              screenshots={screenshots}
              gameName={gameName}
              maxVisible={MEDIA_PREVIEW_MAX_SCREENSHOTS}
            />
            {showMediaLinks && hiddenScreenshotCount > 0 ? (
              <MediaViewMoreLink
                href={buildGameMediaSectionHref(gameSlug!, "screenshots")}
                label={`View all ${screenshots.length} screenshots`}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
