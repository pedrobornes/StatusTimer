import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/legal/LegalDocument";
import { APP_ROUTES } from "@/config/routes";
import { SITE_NAME } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for ${SITE_NAME}.`,
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
              informational website about game server status and related public
              data. This policy explains what information we process when you
              use our services.
            </p>
          ),
        },
        {
          title: "Information we collect",
          content: (
            <>
              <p>We may process the following categories of data:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-200">Usage data:</strong>{" "}
                  standard server logs (IP address, browser type, pages visited,
                  timestamps) for security and performance.
                </li>
                <li>
                  <strong className="text-slate-200">Contact data:</strong> if
                  you email us, we receive the information you choose to send.
                </li>
                <li>
                  <strong className="text-slate-200">Public game data:</strong>{" "}
                  we fetch and display publicly available information from third
                  parties (e.g. Steam, Twitch, IGDB, official feeds).
                </li>
              </ul>
              <p>
                We do not require account registration to browse the site.
              </p>
            </>
          ),
        },
        {
          title: "How we use information",
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Operate and improve the website</li>
              <li>Display server status, news, and catalog information</li>
              <li>Respond to support requests</li>
              <li>Protect against abuse, fraud, and security incidents</li>
              <li>Comply with legal obligations</li>
            </ul>
          ),
        },
        {
          title: "Third-party services",
          content: (
            <p>
              We rely on external APIs and content providers. Those services have
              their own privacy policies. We may also use advertising partners
              in the future; any ad provider will be described in our{" "}
              <Link
                href={APP_ROUTES.cookies}
                className="text-violet-200/90 hover:text-white"
              >
                Cookie Policy
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Cookies",
          content: (
            <p>
              We use essential cookies where required for site functionality.
              See our{" "}
              <Link
                href={APP_ROUTES.cookies}
                className="text-violet-200/90 hover:text-white"
              >
                Cookie Policy
              </Link>{" "}
              for details.
            </p>
          ),
        },
        {
          title: "Data retention",
          content: (
            <p>
              We retain logs and operational data only as long as necessary for
              the purposes above, unless a longer period is required by law.
            </p>
          ),
        },
        {
          title: "Your rights",
          content: (
            <p>
              Depending on your location (including the EEA/UK), you may have
              rights to access, correct, delete, or restrict processing of your
              personal data. Contact us via the{" "}
              <Link
                href={APP_ROUTES.contact}
                className="text-violet-200/90 hover:text-white"
              >
                Contact page
              </Link>{" "}
              to exercise these rights.
            </p>
          ),
        },
        {
          title: "Children",
          content: (
            <p>
              Our service is not directed at children under 13. We do not
              knowingly collect personal data from children.
            </p>
          ),
        },
        {
          title: "Changes",
          content: (
            <p>
              We may update this policy from time to time. The &quot;Last
              updated&quot; date at the top of this page will reflect changes.
            </p>
          ),
        },
      ]}
    />
  );
}
