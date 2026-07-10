import type { GamingNews, UpcomingRelease } from "@/types/api";
import type { GameTelemetry } from "@/types/telemetry";
import {
  resolveGameBoxArtUrl,
  resolveCatalogImageUrl,
} from "@/lib/gameAssets";
import {
  resolveReleaseBoxArtUrl,
  resolveReleaseHeroUrl,
} from "@/lib/releases";
import { resolveStatusPageHeroUrl } from "@/lib/statusHero";

export interface NewsArticleAssets {
  heroUrl: string | null;
  boxArtUrl: string | null;
}

export function resolveNewsArticleAssets(
  gameSlug: string,
  article: Pick<GamingNews, "gameCoverUrl">,
  options: {
    release?: Pick<UpcomingRelease, "logoUrl" | "imageUrl"> | null;
    telemetry?: Pick<GameTelemetry, "logoUrl" | "coverUrl"> | null;
  } = {},
): NewsArticleAssets {
  const release = options.release ?? null;
  const telemetry = options.telemetry ?? null;

  const heroFromRelease = release
    ? resolveReleaseHeroUrl(gameSlug, release)
    : null;
  const heroFromStatus = resolveStatusPageHeroUrl(gameSlug, telemetry);
  const heroUrl = heroFromRelease ?? heroFromStatus;

  const boxFromRelease = release
    ? resolveReleaseBoxArtUrl(gameSlug, release)
    : null;
  const boxFromStatus = resolveGameBoxArtUrl(gameSlug, telemetry ?? undefined);
  const boxArtUrl =
    boxFromRelease ??
    boxFromStatus ??
    resolveCatalogImageUrl(article.gameCoverUrl ?? null, null);

  return { heroUrl, boxArtUrl };
}
