import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/legal/LegalDocument";
import { TRADEMARK_EXAMPLE_HOLDERS } from "@/config/legal";
import { APP_ROUTES } from "@/config/routes";
import { CONTACT_EMAIL, SITE_NAME } from "@/config/site";
import { MONITORED_SOCIAL_PLATFORMS_TEXT } from "@/config/seo";
import { buildNoindexFollowRobots } from "@/lib/seo/indexability";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_NAME}.`,
  alternates: {
    canonical: APP_ROUTES.terms,
  },
  robots: buildNoindexFollowRobots(),
};

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title="Terms of Service"
      subtitle={`Terms governing your use of ${SITE_NAME}.`}
      sections={[
        {
          title: "Agreement",
          content: (
            <p>
              By accessing or using {SITE_NAME} (&quot;the Service&quot;, &quot;we&quot;,
              &quot;us&quot;), you agree to these Terms of Service (&quot;Terms&quot;).
              If you do not agree, do not use the website. These Terms work together
              with our{" "}
              <Link
                href={APP_ROUTES.privacy}
                className="text-violet-200/90 transition hover:text-white"
              >
                Privacy Policy
              </Link>
              ,{" "}
              <Link
                href={APP_ROUTES.cookies}
                className="text-violet-200/90 transition hover:text-white"
              >
                Cookie Policy
              </Link>
              , and{" "}
              <Link
                href={APP_ROUTES.legalNotice}
                className="text-violet-200/90 transition hover:text-white"
              >
                Legal Notice
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Eligibility",
          content: (
            <>
              <p>
                {SITE_NAME} is a general-audience gaming information service. It is
                not directed at young children. If you are below the digital age of
                consent applicable in your country, you may use the Service only with
                the permission and supervision of a parent or legal guardian.
              </p>
              <p>
                We try to exclude sexually explicit or adult-only titles from
                search, catalog listings, releases, and indexable pages. No filter is
                perfect — if you find inappropriate material, please report it
                through our{" "}
                <Link
                  href={APP_ROUTES.contact}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  Contact page
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          title: "Service description",
          content: (
            <>
              <p>
                {SITE_NAME} provides aggregated, publicly available information
                about video games and online services. The Service is offered for
                informational purposes only and does not constitute official
                confirmation of outages, maintenance windows, release dates, or
                publisher statements.
              </p>
              <p>Without limitation, the Service may include:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Multiplayer game server status labels (online, down, or
                  maintenance), uptime history, incident logs, and player metrics
                </li>
                <li>
                  Connectivity checks for social platforms such as{" "}
                  {MONITORED_SOCIAL_PLATFORMS_TEXT}
                </li>
                <li>
                  Upcoming release countdowns, platform targets, community hype
                  counters, and release-related news
                </li>
                <li>
                  Game-specific news, patch notes, trailers, screenshots, and
                  embedded media from third-party hosts
                </li>
                <li>
                  External store or reference links where available (for example,
                  Steam store listings)
                </li>
              </ul>
              <p>
                Hype counters and similar on-site interactions reflect community
                interest on {SITE_NAME} only. They are not official preorder,
                wishlist, or sales figures from any store or publisher.
              </p>
            </>
          ),
        },
        {
          title: "No affiliation",
          content: (
            <p>
              {SITE_NAME} is independent and not affiliated with, endorsed by, or
              sponsored by any game publisher, platform operator, social network, or
              trademark holder referenced on the site. References to third-party
              products or services are for identification and information only.
            </p>
          ),
        },
        {
          id: "trademarks",
          title: "Trademarks and third-party assets",
          content: (
            <>
              <p>
                Game titles, studio and publisher names, platform names, logos,
                icons, news text, videos, images, and related materials displayed on{" "}
                {SITE_NAME} remain the property of their respective owners unless
                otherwise stated. We are not the author, owner, or distributor of
                third-party games, announcements, or embedded media.
              </p>
              <p>
                We use third-party names and assets only in a descriptive,
                informational way — for example, to identify a monitored game,
                show release platforms, or display publicly available news and
                trailers.
              </p>
              <p>
                This includes, without limitation, trademarks and branding
                associated with:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                {TRADEMARK_EXAMPLE_HOLDERS.map((holder) => (
                  <li key={holder}>{holder}</li>
                ))}
                <li>Other publishers, studios, platforms, and services listed on the site</li>
              </ul>
              <p>
                Nothing on this website grants any licence to use third-party
                intellectual property, nor should it be read as approval or
                sponsorship by any rights holder.
              </p>
              <p>
                Rights holders who believe any use should be changed or removed may
                contact us through the{" "}
                <Link
                  href={APP_ROUTES.contact}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  Contact page
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          title: "Third-party links and embedded content",
          content: (
            <p>
              The Service may link to external websites or embed content served by
              third parties (for example YouTube videos or store pages). We do not
              control those services and are not responsible for their availability,
              policies, or content. Your use of third-party services is governed by
              their own terms and privacy policies.
            </p>
          ),
        },
        {
          title: "Acceptable use",
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Do not attempt to disrupt, probe, or overload our systems</li>
              <li>
                Do not scrape, crawl, or automate access in violation of robots.txt,
                rate limits, or applicable law
              </li>
              <li>Do not use the Service for unlawful, harmful, or fraudulent purposes</li>
              <li>
                Do not misrepresent {SITE_NAME} data, labels, or articles as official
                publisher or platform communication
              </li>
              <li>
                Do not manipulate community features such as hype counters through
                bots or artificial traffic
              </li>
              <li>
                Do not upload or transmit malicious code through contact channels or
                any interaction surface we provide
              </li>
            </ul>
          ),
        },
        {
          title: "Advertising",
          content: (
            <p>
              We may introduce advertising on the Service in the future. If we do,
              ad partners may use cookies or similar technologies as described in
              our{" "}
              <Link
                href={APP_ROUTES.cookies}
                className="text-violet-200/90 transition hover:text-white"
              >
                Cookie Policy
              </Link>
              . Where required by law, we will provide consent controls before
              serving non-essential advertising or measurement tags.
            </p>
          ),
        },
        {
          title: "Disclaimer of warranties",
          content: (
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;
              WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING
              WARRANTIES OF ACCURACY, COMPLETENESS, TIMELINESS, AVAILABILITY,
              NON-INFRINGEMENT, OR FITNESS FOR A PARTICULAR PURPOSE. STATUS LABELS,
              METRICS, RELEASE DATES, NEWS, AND EMBEDDED MEDIA MAY BE DELAYED,
              INCOMPLETE, REGION-SPECIFIC, OR INCORRECT.
            </p>
          ),
        },
        {
          title: "Limitation of liability",
          content: (
            <>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, {SITE_NAME.toUpperCase()}{" "}
                AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY
                LOSS OF PROFITS, DATA, GOODWILL, OR BUSINESS OPPORTUNITY, ARISING
                FROM OR RELATED TO YOUR USE OF THE SERVICE OR RELIANCE ON ANY
                INFORMATION DISPLAYED ON IT.
              </p>
              <p>
                Nothing in these Terms excludes or limits liability that cannot be
                excluded or limited under applicable law, including mandatory
                consumer rights where you qualify as a consumer.
              </p>
            </>
          ),
        },
        {
          title: "Intellectual property",
          content: (
            <p>
              The {SITE_NAME} name, site design, original editorial framing, and
              proprietary code are owned by the site operator or its licensors.
              Third-party names, logos, and assets remain the property of their
              respective owners. See{" "}
              <Link
                href={`${APP_ROUTES.terms}#trademarks`}
                className="text-violet-200/90 transition hover:text-white"
              >
                Trademarks and third-party assets
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Suspension and changes",
          content: (
            <>
              <p>
                We may modify, suspend, or discontinue any part of the Service at any
                time. We may also update these Terms from time to time. The
                &quot;Last updated&quot; date at the top of this page reflects the
                latest revision. Continued use after changes constitutes acceptance
                of the updated Terms.
              </p>
              <p>
                We may restrict access when we reasonably believe a user has
                violated these Terms or poses a risk to the Service or other users.
              </p>
            </>
          ),
        },
        {
          title: "Governing law",
          content: (
            <p>
              These Terms are governed by the laws of Spain, without prejudice to
              mandatory consumer protection rules that may apply in your country of
              residence. For operator identification details, see our{" "}
              <Link
                href={APP_ROUTES.legalNotice}
                className="text-violet-200/90 transition hover:text-white"
              >
                Legal Notice
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Contact",
          content: (
            <p>
              Questions about these Terms? Visit our{" "}
              <Link
                href={APP_ROUTES.contact}
                className="text-violet-200/90 transition hover:text-white"
              >
                Contact page
              </Link>
              {CONTACT_EMAIL ? (
                <>
                  {" "}
                  or email{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-violet-200/90 transition hover:text-white"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </>
              ) : null}
              .
            </p>
          ),
        },
      ]}
    />
  );
}
