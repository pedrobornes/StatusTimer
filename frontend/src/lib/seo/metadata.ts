import type { Metadata } from "next";
import { buildGameStatusKeywords } from "@/config/routes";
import { resolveGameDisplayName } from "@/lib/gameAssets";
import { buildRobotsDirective, isIndexableTelemetry } from "@/lib/seo/indexability";
import {
  buildGameStatusMetaDescription,
  buildGameStatusTitle,
} from "@/lib/seo/statusMetadata";
import { formatSlugLabel } from "@/lib/telemetry";
import { getGameStatusDetail } from "@/services/telemetryService";
import type { GameStatusDetail, TelemetryStatus } from "@/types/telemetry";
import { getSiteUrl } from "@/config/site";

const siteUrl = getSiteUrl();

function resolveStatusPageGameName(
  gameSlug: string,
  detail: GameStatusDetail | null,
): string {
  const fromTelemetry = detail?.telemetry?.gameName?.trim();
  if (fromTelemetry) {
    return fromTelemetry;
  }

  const fromCatalog = detail?.gameName?.trim();
  if (fromCatalog) {
    return fromCatalog;
  }

  if (detail?.telemetry) {
    return resolveGameDisplayName(gameSlug, detail.telemetry);
  }

  return formatSlugLabel(gameSlug);
}

export async function buildStatusPageMetadata(gameSlug: string): Promise<Metadata> {
  let gameName = formatSlugLabel(gameSlug);
  const canonicalPath = `/status/${gameSlug}`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  let liveStatus: TelemetryStatus | null = null;
  let lastChecked: string | null = null;
  let indexable = false;

  try {
    const detail = await getGameStatusDetail(gameSlug);
    gameName = resolveStatusPageGameName(gameSlug, detail);
    if (detail.telemetry) {
      liveStatus = detail.telemetry.status;
      lastChecked = detail.telemetry.lastChecked ?? null;
      indexable = isIndexableTelemetry(detail.telemetry);
    }
  } catch {
    liveStatus = null;
    lastChecked = null;
    indexable = false;
  }

  const title = buildGameStatusTitle(gameName, liveStatus);
  const description = buildGameStatusMetaDescription(
    gameName,
    liveStatus,
    lastChecked,
  );

  return {
    title: {
      absolute: title,
    },
    description,
    keywords: buildGameStatusKeywords(gameName, gameSlug),
    alternates: {
      canonical: canonicalPath,
    },
    robots: buildRobotsDirective(indexable),
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "StatusTimer",
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildSiteWideMetadata(): Metadata {
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "StatusTimer | Live Game Server Status & Patch Notes",
      template: "%s | StatusTimer",
    },
    description:
      "Check live gaming server status, outages, official patch notes, and game updates for your favorite multiplayer titles.",
    robots: {
      index: true,
      follow: true,
    },
  };
}
