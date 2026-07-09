import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/legal/LegalDocument";
import { APP_ROUTES } from "@/config/routes";
import { CONTACT_EMAIL, SITE_NAME } from "@/config/site";
import { buildNoindexFollowRobots } from "@/lib/seo/indexability";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `Cookie Policy for ${SITE_NAME}.`,
  alternates: {
    canonical: APP_ROUTES.cookies,
  },
  robots: buildNoindexFollowRobots(),
};

export default function CookiePolicyPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      subtitle={`How ${SITE_NAME} uses cookies and similar technologies.`}
      sections={[
        {
          title: "What are cookies?",
          content: (
            <>
              <p>
                Cookies are small text files stored on your device when you visit
                a website. Similar technologies — such as local storage,
                session storage, and pixels — can serve comparable purposes, for
                example remembering preferences or measuring how pages are used.
              </p>
              <p>
                This policy explains how {SITE_NAME} uses these technologies. It
                should be read together with our{" "}
                <Link
                  href={APP_ROUTES.privacy}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  Privacy Policy
                </Link>{" "}
                and{" "}
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
          title: "Current use on StatusTimer",
          content: (
            <>
              <p>
                Today, {SITE_NAME} is designed to work without account
                registration and without non-essential analytics or advertising
                cookies enabled by default. In practice, that means:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  We do not currently run a third-party analytics suite (for
                  example Google Analytics) on the public site
                </li>
                <li>
                  We do not currently serve third-party advertising tags that set
                  marketing or profiling cookies
                </li>
                <li>
                  Limited technical data may still be processed through server
                  logs and hosting infrastructure as described in our Privacy
                  Policy
                </li>
              </ul>
              <p>
                If we introduce analytics, advertising, or other non-essential
                technologies in the future, we will update this policy and, where
                required by law, ask for your consent before activating them.
              </p>
            </>
          ),
        },
        {
          title: "Cookie categories",
          content: (
            <>
              <p>We group cookies and similar technologies into these categories:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-200">Strictly necessary / essential:</strong>{" "}
                  required for basic site operation, security, load balancing, or
                  fraud prevention. These do not require consent in the EU where
                  they are genuinely essential to provide the service you request.
                </li>
                <li>
                  <strong className="text-slate-200">Functional (if introduced):</strong>{" "}
                  remember choices such as display preferences. These may require
                  consent depending on how they are implemented.
                </li>
                <li>
                  <strong className="text-slate-200">Analytics (optional, not active by default):</strong>{" "}
                  help us understand aggregate traffic and performance if we enable
                  a measurement provider in the future.
                </li>
                <li>
                  <strong className="text-slate-200">Advertising (optional, not active by default):</strong>{" "}
                  if we display third-party ads, partners may set cookies to
                  measure delivery, frequency capping, or relevance.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Third-party content and cookies",
          content: (
            <>
              <p>
                Some pages include embedded content or links operated by third
                parties. Those providers may set their own cookies when you
                interact with their services, even if {SITE_NAME} does not set
                equivalent cookies itself.
              </p>
              <p>Examples include:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-200">YouTube</strong> — embedded
                  trailers and gameplay videos may load resources from Google/YouTube
                  and set cookies if you play or interact with the player
                </li>
                <li>
                  <strong className="text-slate-200">External store pages</strong>{" "}
                  — links to Steam or other platforms are governed by those sites&apos;
                  own cookie policies
                </li>
                <li>
                  <strong className="text-slate-200">Future ad partners</strong> —
                  described here before activation if we introduce ad slots
                </li>
              </ul>
              <p>
                We do not control third-party cookies. Please review the relevant
                provider&apos;s policy for details and opt-out options.
              </p>
            </>
          ),
        },
        {
          title: "Consent and your choices",
          content: (
            <>
              <p>
                If you are in the European Economic Area, United Kingdom, or another
                region that requires consent for non-essential cookies, we will
                provide a consent mechanism before enabling analytics, advertising,
                or similar optional technologies.
              </p>
              <p>You can also:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Change cookie preferences through your browser settings</li>
                <li>Delete cookies already stored on your device</li>
                <li>
                  Block third-party cookies while allowing essential site
                  functionality
                </li>
                <li>
                  Avoid interacting with embedded players or external links if you
                  do not want third-party providers to set cookies
                </li>
              </ul>
              <p>
                Blocking strictly necessary cookies may prevent parts of the site
                from working correctly.
              </p>
            </>
          ),
        },
        {
          title: "Retention",
          content: (
            <p>
              Cookie lifetimes vary by purpose and provider. Session cookies expire
              when you close your browser. Persistent cookies remain until they
              expire or you delete them. When we enable optional providers in the
              future, this section will be updated with more specific retention
              information where available.
            </p>
          ),
        },
        {
          title: "Changes",
          content: (
            <p>
              We may update this Cookie Policy from time to time — for example, when
              we add analytics, advertising, or new embedded providers. The
              &quot;Last updated&quot; date at the top of this page reflects the
              latest revision.
            </p>
          ),
        },
        {
          title: "More information",
          content: (
            <p>
              For how we process personal data, see our{" "}
              <Link
                href={APP_ROUTES.privacy}
                className="text-violet-200/90 transition hover:text-white"
              >
                Privacy Policy
              </Link>
              . For operator details, see our{" "}
              <Link
                href={APP_ROUTES.legalNotice}
                className="text-violet-200/90 transition hover:text-white"
              >
                Legal Notice
              </Link>
              . Questions?{" "}
              <Link
                href={APP_ROUTES.contact}
                className="text-violet-200/90 transition hover:text-white"
              >
                Contact us
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
