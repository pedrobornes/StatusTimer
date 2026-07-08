import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/legal/LegalDocument";
import { APP_ROUTES } from "@/config/routes";
import { SITE_NAME } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_NAME}.`,
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
              By accessing or using {SITE_NAME}, you agree to these Terms of
              Service. If you do not agree, do not use the website.
            </p>
          ),
        },
        {
          title: "Service description",
          content: (
            <p>
              {SITE_NAME} provides aggregated, publicly available information
              about game server status, player metrics, releases, and news. The
              service is provided for informational purposes only and does not
              constitute official confirmation of outages or publisher
              statements.
            </p>
          ),
        },
        {
          title: "No affiliation",
          content: (
            <p>
              {SITE_NAME} is independent and not affiliated with any game
              publisher, platform, or trademark holder referenced on the site.
              All trademarks are the property of their respective owners.
            </p>
          ),
        },
        {
          title: "Acceptable use",
          content: (
            <ul className="list-disc space-y-2 pl-5">
              <li>Do not attempt to disrupt or overload our systems</li>
              <li>Do not scrape the site in violation of robots.txt or rate limits</li>
              <li>Do not use the service for unlawful purposes</li>
              <li>Do not misrepresent StatusTimer data as official publisher communication</li>
            </ul>
          ),
        },
        {
          title: "Disclaimer of warranties",
          content: (
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
              INCLUDING ACCURACY, AVAILABILITY, OR FITNESS FOR A PARTICULAR
              PURPOSE. STATUS DATA MAY BE DELAYED OR INCOMPLETE.
            </p>
          ),
        },
        {
          title: "Limitation of liability",
          content: (
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, {SITE_NAME.toUpperCase()}{" "}
              AND ITS OPERATORS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
              SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE
              OF THE SERVICE.
            </p>
          ),
        },
        {
          title: "Intellectual property",
          content: (
            <p>
              Site design, branding, and original content are owned by{" "}
              {SITE_NAME} or its licensors. Third-party names and assets remain
              the property of their respective owners.
            </p>
          ),
        },
        {
          title: "Changes",
          content: (
            <p>
              We may modify these terms at any time. Continued use after changes
              constitutes acceptance. See also our{" "}
              <Link
                href={APP_ROUTES.privacy}
                className="text-violet-200/90 hover:text-white"
              >
                Privacy Policy
              </Link>
              .
            </p>
          ),
        },
        {
          title: "Contact",
          content: (
            <p>
              Questions about these terms? Visit our{" "}
              <Link
                href={APP_ROUTES.contact}
                className="text-violet-200/90 hover:text-white"
              >
                Contact page
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
