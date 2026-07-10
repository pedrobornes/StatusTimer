import type { GameMediaContent } from "@/components/GameMediaSidebar";
import { APP_ROUTES } from "@/config/routes";

/** Inline preview limits on status / release pages. */
export const MEDIA_PREVIEW_MAX_VIDEOS = 3;
export const MEDIA_PREVIEW_MAX_SCREENSHOTS = 8;

export type GameMediaSection = "videos" | "screenshots";

export function buildGameMediaSectionHref(
  gameSlug: string,
  section: GameMediaSection,
): string {
  return `${APP_ROUTES.gameMedia(gameSlug)}#${section}`;
}

export function resolveGameMedia(
  ...sources: Array<GameMediaContent | null | undefined>
): GameMediaContent {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const screenshots = source.screenshotUrls ?? [];
    const trailers = source.trailerVideoIds ?? [];

    if (screenshots.length > 0 || trailers.length > 0) {
      return {
        screenshotUrls: screenshots,
        trailerVideoIds: trailers,
        youtubeChannelUrl: source.youtubeChannelUrl ?? null,
      };
    }
  }

  return {
    screenshotUrls: [],
    trailerVideoIds: [],
    youtubeChannelUrl: null,
  };
}

export function hasGameMedia(media: GameMediaContent): boolean {
  return (
    (media.screenshotUrls?.length ?? 0) > 0 ||
    (media.trailerVideoIds?.length ?? 0) > 0
  );
}
