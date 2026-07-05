import type { Metadata } from "next";
import {
  buildGameStatusDescription,
  buildGameStatusKeywords,
  buildGameStatusTitle,
} from "@/config/routes";
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
    return `${base} Current telemetry reports ${gameName} as DOWN.`;
  }

  if (status === "MAINTENANCE") {
    return `${base} Current telemetry reports ${gameName} under maintenance.`;
  }

  if (status === "ONLINE") {
    return `${base} Current telemetry reports ${gameName} as ONLINE.`;
  }

  return base;
}

export async function buildStatusPageMetadata(gameSlug: string): Promise<Metadata> {
  const gameName = formatSlugLabel(gameSlug);
  const title = buildGameStatusTitle(gameName);
  const canonicalPath = `/status/${gameSlug}`;
  const canonicalUrl = `${siteUrl}${canonicalPath}`;

  let liveStatus: TelemetryStatus | null = null;
  try {
    const telemetry = await getGameTelemetryBySlug(gameSlug);
    liveStatus = telemetry.status;
  } catch {
    liveStatus = null;
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
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
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
      default: "StatusTimer | Live Gaming Server Status & AI News",
      template: "%s | StatusTimer",
    },
    description:
      "Track live gaming server status, outages, and Ollama-processed patch intelligence for top multiplayer titles.",
    robots: {
      index: true,
      follow: true,
    },
  };
}
