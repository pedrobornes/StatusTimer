import {
  APP_ROUTES,
  buildGameStatusDescription,
  buildGameStatusTitle,
} from "@/config/routes";
import { formatSlugLabel } from "@/lib/telemetry";
import type { TelemetryStatus } from "@/types/telemetry";

interface StatusPageJsonLdInput {
  gameSlug: string;
  status: TelemetryStatus;
  lastChecked: string;
  pageUrl: string;
  siteUrl: string;
  incidentCount: number;
}

function mapSchemaServiceStatus(status: TelemetryStatus): string {
  if (status === "ONLINE") {
    return "https://schema.org/Online";
  }

  if (status === "MAINTENANCE") {
    return "https://schema.org/LimitedAvailability";
  }

  return "https://schema.org/Offline";
}

function mapWatchActionStatus(status: TelemetryStatus): string {
  if (status === "ONLINE") {
    return "https://schema.org/CompletedActionStatus";
  }

  return "https://schema.org/ActiveActionStatus";
}

export function buildStatusPageJsonLd(input: StatusPageJsonLdInput): Record<string, unknown> {
  const gameName = formatSlugLabel(input.gameSlug);
  const pageName = buildGameStatusTitle(gameName);
  const pageDescription = buildGameStatusDescription(gameName);
  const organizationId = `${input.siteUrl}/#organization`;
  const websiteId = `${input.siteUrl}/#website`;
  const pageId = `${input.pageUrl}#webpage`;
  const serviceId = `${input.pageUrl}#service`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "StatusTimer",
        url: input.siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: input.siteUrl,
        name: "StatusTimer",
        publisher: {
          "@id": organizationId,
        },
        potentialAction: {
          "@type": "ViewAction",
          name: "Browse live game server status pages",
          target: `${input.siteUrl}${APP_ROUTES.telemetry}`,
        },
      },
      {
        "@type": "WebPage",
        "@id": pageId,
        url: input.pageUrl,
        name: pageName,
        description: pageDescription,
        isPartOf: {
          "@id": websiteId,
        },
        about: {
          "@type": "VideoGame",
          name: gameName,
        },
        dateModified: input.lastChecked,
        inLanguage: "en-US",
      },
      {
        "@type": "Service",
        "@id": serviceId,
        name: `${gameName} Online Services`,
        serviceType: "Multiplayer game server availability",
        provider: {
          "@id": organizationId,
        },
        areaServed: "Worldwide",
        serviceStatus: mapSchemaServiceStatus(input.status),
      },
      {
        "@type": "WatchAction",
        name: `Monitor ${gameName} live server status`,
        target: {
          "@type": "EntryPoint",
          urlTemplate: input.pageUrl,
          actionPlatform: [
            "https://schema.org/DesktopWebPlatform",
            "https://schema.org/MobileWebPlatform",
          ],
        },
        actionStatus: mapWatchActionStatus(input.status),
        object: {
          "@id": serviceId,
        },
        result: {
          "@type": "Thing",
          name:
            input.status === "ONLINE"
              ? `${gameName} servers are operational`
              : input.status === "MAINTENANCE"
                ? `${gameName} servers are under maintenance`
                : `${gameName} servers are disrupted`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: input.siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: `${gameName} Server Status`,
            item: input.pageUrl,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${gameName} recent incident reports`,
        numberOfItems: input.incidentCount,
        itemListElement: [],
      },
    ],
  };
}

/** @deprecated Use buildStatusPageJsonLd instead. */
export function buildServiceStatusJsonLd(
  input: Omit<StatusPageJsonLdInput, "siteUrl" | "incidentCount"> & {
    incidentCount?: number;
  },
): Record<string, unknown> {
  return buildStatusPageJsonLd({
    ...input,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    incidentCount: input.incidentCount ?? 0,
  });
}
