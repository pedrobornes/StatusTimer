import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/legal/LegalDocument";
import { TRADEMARK_FOOTER_NOTICE } from "@/config/legal";
import { APP_ROUTES } from "@/config/routes";
import { CONTACT_EMAIL, SITE_NAME } from "@/config/site";
import { MONITORED_SOCIAL_PLATFORMS_TEXT } from "@/config/seo";
import { buildNoindexFollowRobots } from "@/lib/seo/indexability";

export const metadata: Metadata = {
  title: "Legal Notice",
  description: `Legal notice and disclosures for ${SITE_NAME}.`,
  alternates: {
    canonical: APP_ROUTES.legalNotice,
  },
  robots: buildNoindexFollowRobots(),
};

export default function LegalNoticePage() {
  return (
    <LegalDocument
      title="Legal Notice"
      subtitle={`Legal disclosures and conditions of use for ${SITE_NAME}.`}
      sections={[
        {
          title: "Users",
          content: (
            <p>
              Accessing or using this website grants you the status of USER and
              implies acceptance of the general conditions of use reflected in
              our{" "}
              <Link
                href={APP_ROUTES.terms}
                className="text-violet-200/90 transition hover:text-white"
              >
                Terms of Service
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Nature and scope of the service",
          content: (
            <>
              <p>
                {SITE_NAME} is an independent informational website. Through it,
                users may consult aggregated, publicly available data about video
                games and online services. The portal does not require
                registration for basic browsing and is intended for personal,
                non-commercial consultation unless otherwise agreed in writing.
              </p>
              <p>Among other features, the website allows users to:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Check multiplayer game server status labels (online, down, or
                  maintenance), uptime history, incident logs, and player
                  activity metrics where available
                </li>
                <li>
                  Review connectivity checks for social platforms such as{" "}
                  {MONITORED_SOCIAL_PLATFORMS_TEXT}
                </li>
                <li>
                  Browse upcoming game releases, launch countdowns, confirmed
                  platforms, community hype counters, and release-related news
                </li>
                <li>
                  Read game-specific news articles, patch notes, and developer
                  announcements
                </li>
                <li>
                  View trailers, gameplay videos, screenshots, and linked media
                  associated with catalog titles, including embedded content
                  from third-party hosts (for example, YouTube)
                </li>
                <li>
                  Access store or external links when provided for reference
                  (for example, Steam store listings)
                </li>
                <li>
                  Search the game catalog and navigate to per-game status,
                  release, news, and media pages
                </li>
              </ul>
              <p>
                All of the above is offered for informational purposes only.
                Users are responsible for appropriate use of the portal and its
                contents.
              </p>
            </>
          ),
        },
        {
          title: "Third-party content and intellectual property",
          content: (
            <>
              <p>{TRADEMARK_FOOTER_NOTICE}</p>
              <p>
                {SITE_NAME} is not the author, owner, publisher, distributor,
                or rights holder of the games, platforms, news articles, videos,
                images, logos, trademarks, or other materials referenced or
                displayed on this website, except for the site&apos;s own
                design, code, and original editorial framing.
              </p>
              <p>
                News text, patch notes, and announcements are aggregated from
                third-party sources and may be summarized or reformatted for
                display. Embedded videos and images are served by their
                respective providers; playback and availability depend on those
                third parties.
              </p>
              <p>
                References to game titles, studio names, platform names, and
                branding are used solely to identify products and services for
                informational purposes. Nothing on this site grants any licence
                to use third-party intellectual property, nor should it be read
                as approval or sponsorship by any rights holder.
              </p>
              <p>
                Rights holders who believe any content should be corrected or
                removed may contact us through the{" "}
                <Link
                  href={APP_ROUTES.contact}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  Contact page
                </Link>
                . Further detail is available in our{" "}
                <Link
                  href={`${APP_ROUTES.terms}#trademarks`}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  Terms of Service — Trademarks and third-party assets
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          title: "Data protection",
          content: (
            <p>
              This website complies with applicable data protection regulations,
              including the GDPR. For details on how we process personal data,
              see our{" "}
              <Link
                href={APP_ROUTES.privacy}
                className="text-violet-200/90 transition hover:text-white"
              >
                Privacy Policy
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Disclaimer and limitation of liability",
          content: (
            <>
              <p>
                {SITE_NAME} does not guarantee the accuracy, completeness, or
                timeliness of any status label, metric, release date, news item,
                or embedded media. Data may be delayed, incomplete, or affected
                by regional differences. Server and platform status information
                is not official confirmation from game publishers, platform
                operators, or rights holders.
              </p>
              <p>
                {SITE_NAME} is not liable, to the maximum extent permitted by
                applicable law, for damages of any kind that may arise from
                errors or omissions in content, reliance on displayed
                information, lack of availability of the portal, or the
                transmission of viruses or malicious programs in content, despite
                having adopted reasonable technological measures to prevent
                them.
              </p>
              <p>
                For full warranty disclaimers and liability limitations, see our{" "}
                <Link
                  href={APP_ROUTES.terms}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  Terms of Service
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          title: "Site operator",
          content: (
            <>
              <p>
                In compliance with Spanish Law 34/2002 on Information Society
                Services and Electronic Commerce (LSSI-CE), the following
                identifying information is provided:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-200">Site owner:</strong> Pedro
                  Antonio Bornes Durán
                </li>
                <li>
                  <strong className="text-slate-200">Tax ID (NIF):</strong>{" "}
                  47426892H
                </li>
                <li>
                  <strong className="text-slate-200">Contact email:</strong>{" "}
                  {CONTACT_EMAIL ? (
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="text-violet-200/90 transition hover:text-white"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  ) : (
                    "See the contact page"
                  )}
                </li>
              </ul>
            </>
          ),
        },
      ]}
    />
  );
}
