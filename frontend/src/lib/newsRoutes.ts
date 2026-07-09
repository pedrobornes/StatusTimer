import { APP_ROUTES } from "@/config/routes";
import type { UpcomingRelease } from "@/types/api";
import type { GameTelemetry } from "@/types/telemetry";

export interface NewsGameContext {
  gameSlug: string;
  isReleaseOnly: boolean;
  profileHref: string;
  newsIndexHref: string;
}

export function resolveNewsGameContext(
  gameSlug: string,
  releases: readonly UpcomingRelease[],
  telemetry?: Pick<GameTelemetry, "status" | "isUpcoming"> | null,
): NewsGameContext {
  const appearsInReleaseCatalog = releases.some(
    (release) => release.slug === gameSlug,
  );

  const isUpcoming =
    appearsInReleaseCatalog ||
    telemetry?.status === "UPCOMING" ||
    telemetry?.isUpcoming === true;

  if (isUpcoming) {
    return {
      gameSlug,
      isReleaseOnly: true,
      profileHref: APP_ROUTES.release(gameSlug),
      newsIndexHref: APP_ROUTES.releaseNews(gameSlug),
    };
  }

  return {
    gameSlug,
    isReleaseOnly: false,
    profileHref: APP_ROUTES.status(gameSlug),
    newsIndexHref: APP_ROUTES.gameNews(gameSlug),
  };
}
