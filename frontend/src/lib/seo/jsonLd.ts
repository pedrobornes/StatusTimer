import { APP_ROUTES, buildGameStatusTitle } from "@/config/routes";
import { getSiteUrl } from "@/config/site";
import { formatSlugLabel } from "@/lib/telemetry";
import type { GameFaqItem } from "@/lib/seo/gameFaq";
import { buildGameStatusMetaDescription } from "@/lib/seo/statusMetadata";
import type { TelemetryStatus } from "@/types/telemetry";

interface StatusPageJsonLdInput {
  gameSlug: string;
  gameName?: string;
  status: TelemetryStatus;
  lastChecked: string;
  pageUrl: string;
  siteUrl: string;
  incidentCount: number;
  faqItems?: GameFaqItem[];
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
  const gameName = input.gameName?.trim() || formatSlugLabel(input.gameSlug);
  const pageName = buildGameStatusTitle(gameName, input.status);
  const pageDescription = buildGameStatusMetaDescription(
    gameName,
    input.status,
    input.lastChecked,
  );
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
          target: `${input.siteUrl}${APP_ROUTES.games}`,
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
      ...(input.faqItems && input.faqItems.length > 0
        ? [
            {
              "@type": "FAQPage",
              mainEntity: input.faqItems.map((item) => ({
                "@type": "Question",
                name: item.question,
                acceptedAnswer: {
                  "@type": "Answer",
                  text: item.answer,
                },
              })),
            },
          ]
        : []),
    ],
  };
}

interface NewsArticleJsonLdInput {
  headline: string;
  description: string;
  pageUrl: string;
  siteUrl: string;
  gameName: string;
  gameStatusUrl: string;
  publishedAt: string;
  modifiedAt: string;
}

export function buildNewsArticleJsonLd(
  input: NewsArticleJsonLdInput,
): Record<string, unknown> {
  const organizationId = `${input.siteUrl}/#organization`;

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
        "@type": "NewsArticle",
        headline: input.headline,
        description: input.description,
        url: input.pageUrl,
        datePublished: input.publishedAt,
        dateModified: input.modifiedAt,
        inLanguage: "en-US",
        author: {
          "@type": "Organization",
          name: "StatusTimer",
        },
        publisher: {
          "@type": "Organization",
          name: "StatusTimer",
          url: input.siteUrl,
        },
        about: {
          "@type": "VideoGame",
          name: input.gameName,
        },
        isPartOf: {
          "@type": "WebPage",
          url: input.gameStatusUrl,
          name: `${input.gameName} Server Status`,
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
            name: `${input.gameName} Server Status`,
            item: input.gameStatusUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: input.headline,
            item: input.pageUrl,
          },
        ],
      },
    ],
  };
}

interface ReleasePageJsonLdInput {
  gameName: string;
  releaseDate: string | null;
  pageUrl: string;
  siteUrl: string;
  platforms: string[];
}

export function buildReleasePageJsonLd(
  input: ReleasePageJsonLdInput,
): Record<string, unknown> {
  const organizationId = `${input.siteUrl}/#organization`;
  const releasesHubUrl = `${input.siteUrl}${APP_ROUTES.releases}`;

  const videoGame: Record<string, unknown> = {
    "@type": "VideoGame",
    name: input.gameName,
    url: input.pageUrl,
  };

  if (input.releaseDate) {
    videoGame.releaseDate = input.releaseDate;
  }

  if (input.platforms.length > 0) {
    videoGame.gamePlatform = input.platforms;
  }

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
        "@type": "WebPage",
        url: input.pageUrl,
        name: `${input.gameName} Release Date & Countdown`,
        description: input.releaseDate
          ? `Release date and countdown for ${input.gameName}.`
          : `Upcoming release tracker for ${input.gameName}.`,
        about: videoGame,
      },
      videoGame,
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
            name: "Upcoming Releases",
            item: releasesHubUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: input.gameName,
            item: input.pageUrl,
          },
        ],
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
    siteUrl: getSiteUrl(),
    incidentCount: input.incidentCount ?? 0,
  });
}
