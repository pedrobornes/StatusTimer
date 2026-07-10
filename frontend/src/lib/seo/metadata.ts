import type { Metadata } from "next";
import {
  buildGameStatusDescription,
  buildGameStatusKeywords,
  buildGameStatusTitle,
} from "@/config/routes";
import { resolveGameDisplayName } from "@/lib/gameAssets";
import { buildRobotsDirective, isIndexableTelemetry } from "@/lib/seo/indexability";
import { formatSlugLabel } from "@/lib/telemetry";
import { getGameStatusDetail } from "@/services/telemetryService";
import type { GameStatusDetail, TelemetryStatus } from "@/types/telemetry";
import { getSiteUrl } from "@/config/site";

const siteUrl = getSiteUrl();

function buildStatusAwareDescription(
  gameName: string,
  status: TelemetryStatus | null,
): string {
  const base = buildGameStatusDescription(gameName);

  if (status === "DOWN") {
    return `${base} Right now, ${gameName} looks down.`;
  }

  if (status === "MAINTENANCE") {
    return `${base} Right now, ${gameName} is in maintenance.`;
  }

  if (status === "ONLINE") {
    return `${base} Right now, ${gameName} servers look online.`;
  }

  return base;
}

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
  let indexable = false;

  try {
    const detail = await getGameStatusDetail(gameSlug);
    gameName = resolveStatusPageGameName(gameSlug, detail);
    if (detail.telemetry) {
      liveStatus = detail.telemetry.status;
      indexable = isIndexableTelemetry(detail.telemetry);
    }
  } catch {
    liveStatus = null;
    indexable = false;
  }

  const title = buildGameStatusTitle(gameName);
  const description = buildStatusAwareDescription(gameName, liveStatus);

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
