import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/legal/LegalDocument";
import { APP_ROUTES } from "@/config/routes";
import { CONTACT_EMAIL, SITE_NAME } from "@/config/site";
import { MONITORED_SOCIAL_PLATFORMS_TEXT } from "@/config/seo";
import { buildNoindexFollowRobots } from "@/lib/seo/indexability";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${SITE_NAME}.`,
  alternates: {
    canonical: APP_ROUTES.privacy,
  },
  robots: buildNoindexFollowRobots(),
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      subtitle={`How ${SITE_NAME} collects, uses, and protects information.`}
      sections={[
        {
          title: "Overview",
          content: (
            <p>
              {SITE_NAME} (&quot;we&quot;, &quot;us&quot;) operates an
              independent informational website about multiplayer game server
              status, social platform connectivity checks (
              {MONITORED_SOCIAL_PLATFORMS_TEXT}), upcoming releases, and
              game-specific news and media. This policy explains what personal
              data we process when you use our website and why.
            </p>
          ),
        },
        {
          title: "Data controller",
          content: (
            <p>
              The data controller is the site operator identified in our{" "}
              <Link
                href={APP_ROUTES.legalNotice}
                className="text-violet-200/90 transition hover:text-white"
              >
                Legal Notice
              </Link>
              . For privacy requests, contact{" "}
              {CONTACT_EMAIL ? (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  {CONTACT_EMAIL}
                </a>
              ) : (
                "us through the Contact page"
              )}
              .
            </p>
          ),
        },
        {
          title: "Information we collect",
          content: (
            <>
              <p>
                We do not require account registration to browse the site. We may
                process the following categories of data:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-200">Usage and technical data:</strong>{" "}
                  standard server and application logs (for example IP address,
                  browser type, referring page, pages visited, timestamps, and
                  error reports) for security, abuse prevention, and performance.
                </li>
                <li>
                  <strong className="text-slate-200">Contact data:</strong> if you
                  email us or use the contact form, we receive the information you
                  choose to send (such as your email address and message content).
                </li>
                <li>
                  <strong className="text-slate-200">Interaction data:</strong>{" "}
                  limited on-site actions such as registering interest on a release
                  hype counter. We do not ask for your name or email for this feature.
                </li>
                <li>
                  <strong className="text-slate-200">Cookie and similar technologies:</strong>{" "}
                  as described in our{" "}
                  <Link
                    href={APP_ROUTES.cookies}
                    className="text-violet-200/90 transition hover:text-white"
                  >
                    Cookie Policy
                  </Link>
                  .
                </li>
                <li>
                  <strong className="text-slate-200">Public game and platform data:</strong>{" "}
                  we fetch and display publicly available information from third-party
                  APIs and feeds (for example Steam, Twitch, IGDB, and official news
                  sources). This data is not your personal data.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Legal basis for processing",
          content: (
            <>
              <p>
                Where the GDPR or similar laws apply, we rely on the following
                legal bases:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-200">Legitimate interests</strong>{" "}
                  — to operate, secure, and improve the website and display
                  aggregated status information.
                </li>
                <li>
                  <strong className="text-slate-200">Consent</strong> — for
                  non-essential cookies, analytics, or advertising when enabled
                  and where required by law.
                </li>
                <li>
                  <strong className="text-slate-200">Contract / pre-contractual steps</strong>{" "}
                  — when responding to messages you send us.
                </li>
                <li>
                  <strong className="text-slate-200">Legal obligation</strong> — when
                  retention or disclosure is required by applicable law.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "How we use information",
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Operate, maintain, and improve the website</li>
              <li>
                Display game server status, social platform checks, releases, news,
                and embedded media
              </li>
              <li>Respond to support requests and correction reports</li>
              <li>Protect against abuse, fraud, and security incidents</li>
              <li>Measure aggregate traffic if analytics are enabled</li>
              <li>Comply with legal obligations</li>
            </ul>
          ),
        },
        {
          title: "Third-party services and embedded content",
          content: (
            <>
              <p>
                We rely on external APIs, hosting providers, and content platforms.
                Those providers process data under their own privacy policies. This
                includes, for example:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Game data and metadata providers (Steam, Twitch, IGDB, and similar)</li>
                <li>
                  Embedded videos or images (for example YouTube), which may set
                  their own cookies or collect usage data when you interact with
                  the player
                </li>
                <li>
                  Future advertising partners, described in our Cookie Policy when
                  active
                </li>
              </ul>
              <p>
                We do not sell your personal data. We do not share personal data
                with third parties except as needed to run the service, comply with
                law, or with your consent.
              </p>
            </>
          ),
        },
        {
          title: "International transfers",
          content: (
            <p>
              Some providers we use may process data outside the European Economic
              Area (for example in the United States). Where required, we rely on
              appropriate safeguards such as Standard Contractual Clauses or
              equivalent mechanisms offered by those providers.
            </p>
          ),
        },
        {
          title: "Data retention",
          content: (
            <p>
              We retain logs and operational data only as long as necessary for the
              purposes described above, unless a longer period is required by law.
              Contact messages are kept for as long as needed to handle your request
              and maintain a reasonable record of correspondence.
            </p>
          ),
        },
        {
          title: "Your rights",
          content: (
            <>
              <p>
                Depending on your location (including the EEA, UK, and Spain), you
                may have the right to:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Access the personal data we hold about you</li>
                <li>Rectify inaccurate data</li>
                <li>Request erasure in certain circumstances</li>
                <li>Restrict or object to processing in certain circumstances</li>
                <li>Data portability where applicable</li>
                <li>Withdraw consent at any time for consent-based processing</li>
                <li>
                  Lodge a complaint with a supervisory authority — in Spain, the{" "}
                  <a
                    href="https://www.aepd.es"
                    className="text-violet-200/90 transition hover:text-white"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Agencia Española de Protección de Datos (AEPD)
                  </a>
                </li>
              </ul>
              <p>
                To exercise your rights, contact us via the{" "}
                <Link
                  href={APP_ROUTES.contact}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  Contact page
                </Link>
                {CONTACT_EMAIL ? (
                  <>
                    {" "}
                    or{" "}
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
            </>
          ),
        },
        {
          title: "Children",
          content: (
            <>
              <p>
                {SITE_NAME} is a general-audience gaming information site and is not
                directed at young children. We do not knowingly collect personal data
                from anyone below the digital age of consent applicable in their
                country (14 years in Spain; up to 16 years in some EU member states).
              </p>
              <p>
                We also try to exclude sexually explicit or adult-only Steam titles
                from search, catalog listings, releases, and SEO pages. If you are a
                parent or guardian and believe a child has provided us personal data,
                or that an inappropriate title slipped through our filters, please
                contact us and we will review it promptly.
              </p>
            </>
          ),
        },
        {
          title: "Changes",
          content: (
            <p>
              We may update this policy from time to time. The &quot;Last
              updated&quot; date at the top of this page will reflect changes.
              Material changes may also be noted on the website where appropriate.
            </p>
          ),
        },
      ]}
    />
  );
}
