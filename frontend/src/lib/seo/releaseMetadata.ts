import type { Metadata } from "next";
import { APP_ROUTES } from "@/config/routes";
import { buildRobotsDirective } from "@/lib/seo/indexability";
import type { UpcomingRelease } from "@/types/api";
import { getSiteUrl } from "@/config/site";

const siteUrl = getSiteUrl();

function formatReleaseDateLabel(releaseDate: string | null): string | null {
  if (!releaseDate) {
    return null;
  }

  const parsed = new Date(releaseDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildReleaseKeywords(gameName: string, releaseDate: string | null): string[] {
  const lowered = gameName.toLowerCase();
  const keywords = [
    `${gameName} release date`,
    `when does ${lowered} come out`,
    `${lowered} launch date`,
    `${gameName} countdown`,
    "upcoming game release",
  ];

  if (releaseDate) {
    const year = releaseDate.slice(0, 4);
    keywords.push(`${gameName} release ${year}`, `new games ${year}`);
  }

  return keywords;
}

export function buildReleasesHubMetadata(): Metadata {
  const canonicalPath = APP_ROUTES.releases;
  const description =
    "Track upcoming game release dates, launch windows, and countdowns. Browse new games releasing soon across PC, PlayStation, Xbox, and Switch.";

  return {
    title: "Upcoming Game Releases & Launch Dates",
    description,
    alternates: {
      canonical: canonicalPath,
    },
    robots: buildRobotsDirective(true),
    keywords: [
      "upcoming game releases",
      "new games 2026",
      "new games 2027",
      "game release dates",
      "game launch countdown",
    ],
    openGraph: {
      title: "Upcoming Game Releases & Launch Dates | StatusTimer",
      description,
      url: `${siteUrl}${canonicalPath}`,
      siteName: "StatusTimer",
      locale: "en_US",
      type: "website",
    },
  };
}

export function buildReleasePageMetadata(release: UpcomingRelease): Metadata {
  const canonicalPath = APP_ROUTES.release(release.slug);
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const formattedDate = formatReleaseDateLabel(release.releaseDate);
  const title = formattedDate
    ? `${release.gameName} Release Date — ${formattedDate}`
    : `${release.gameName} Release Date & Countdown`;
  const description = formattedDate
    ? `${release.gameName} releases on ${formattedDate}. Live countdown, confirmed platforms, hype tracker, trailers, and patch notes.`
    : `When does ${release.gameName} release? Track the launch window, platforms, hype, and news for ${release.gameName}.`;

  return {
    title,
    description,
    keywords: buildReleaseKeywords(release.gameName, release.releaseDate),
    alternates: {
      canonical: canonicalPath,
    },
    robots: buildRobotsDirective(true),
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
