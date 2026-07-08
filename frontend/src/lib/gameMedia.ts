import type { GameMediaContent } from "@/components/GameMediaSidebar";

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
