import { resolveGameCoverUrl } from "@/lib/gameAssets";
import { resolveReleaseHeroUrl } from "@/lib/releases";
import { getUpcomingReleases } from "@/services/releasesService";
import { getGameStatusDetail } from "@/services/telemetryService";
import type { UpcomingRelease } from "@/types/api";
import type { GameTelemetry } from "@/types/telemetry";

/**
 * Resolves the wide hero banner used on /status/[slug] (horizontal artwork,
 * not the vertical box-art thumbnail).
 */
export function resolveStatusPageHeroUrl(
  slug: string,
  telemetry?: Pick<GameTelemetry, "logoUrl" | "coverUrl"> | null,
  releaseEntry?: Pick<UpcomingRelease, "logoUrl" | "imageUrl"> | null,
): string | null {
  return releaseEntry
    ? resolveReleaseHeroUrl(slug, releaseEntry)
    : resolveGameCoverUrl(slug, telemetry ?? undefined);
}

export async function loadStatusPageHeroUrl(slug: string): Promise<string | null> {
  const [statusDetail, releases] = await Promise.all([
    getGameStatusDetail(slug).catch(() => null),
    getUpcomingReleases().catch(() => []),
  ]);

  if (!statusDetail) {
    return null;
  }

  const releaseEntry = releases.find((release) => release.slug === slug);

  return resolveStatusPageHeroUrl(
    slug,
    statusDetail.telemetry,
    releaseEntry ?? null,
  );
}
