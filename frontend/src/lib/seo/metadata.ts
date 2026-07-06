import type { Metadata } from "next";
import {
  buildGameStatusDescription,
  buildGameStatusKeywords,
  buildGameStatusTitle,
} from "@/config/routes";
import { buildRobotsDirective, isIndexableTelemetry } from "@/lib/seo/indexability";
import { formatSlugLabel } from "@/lib/telemetry";
import { getGameTelemetryBySlug } from "@/services/telemetryService";
import type { TelemetryStatus } from "@/types/telemetry";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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

export async function buildStatusPageMetadata(gameSlug: string): Promise<Metadata> {
  const gameName = formatSlugLabel(gameSlug);
  const title = buildGameStatusTitle(gameName);
  const canonicalPath = `/status/${gameSlug}`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  let liveStatus: TelemetryStatus | null = null;
  let indexable = false;

  try {
    const telemetry = await getGameTelemetryBySlug(gameSlug);
    liveStatus = telemetry.status;
    indexable = isIndexableTelemetry(telemetry);
  } catch {
    liveStatus = null;
    indexable = false;
  }

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
      default: "StatusTimer | Live Gaming Server Status & Game News",
      template: "%s | StatusTimer",
    },
    description:
      "Check live gaming server status, outages, and game news for your favorite multiplayer titles.",
    robots: {
      index: true,
      follow: true,
    },
  };
}
