import type { GameTelemetry } from "@/types/telemetry";
import { resolveGameCoverUrl } from "@/lib/gameAssets";
import { getGameStatusDetail } from "@/services/telemetryService";

/**
 * Resolves the wide hero banner used on /status/[slug] (horizontal artwork,
 * not the vertical box-art thumbnail). Uses telemetry hero from the catalog API,
 * which already applies pinned fallbacks and landscape-only filtering.
 */
export function resolveStatusPageHeroUrl(
  slug: string,
  telemetry?: Pick<GameTelemetry, "logoUrl" | "coverUrl"> | null,
): string | null {
  return resolveGameCoverUrl(slug, telemetry ?? undefined);
}

export async function loadStatusPageHeroUrl(slug: string): Promise<string | null> {
  const statusDetail = await getGameStatusDetail(slug).catch(() => null);

  if (!statusDetail) {
    return null;
  }

  return resolveStatusPageHeroUrl(slug, statusDetail.telemetry);
}
