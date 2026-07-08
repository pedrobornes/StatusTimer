import type { Metadata } from "next";
import Link from "next/link";
import LegalDocument from "@/components/legal/LegalDocument";
import { APP_ROUTES } from "@/config/routes";
import { SITE_NAME } from "@/config/site";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `Cookie Policy for ${SITE_NAME}.`,
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
            <p>
              Cookies are small text files stored on your device when you visit
              a website. They help sites remember preferences and understand how
              pages are used.
            </p>
          ),
        },
        {
          title: "Cookies we use",
          content: (
            <>
              <p>We use the following categories:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong className="text-slate-200">Essential:</strong> required
                  for basic site operation and security.
                </li>
                <li>
                  <strong className="text-slate-200">Analytics (optional):</strong>{" "}
                  if enabled, help us understand traffic patterns in aggregate.
                </li>
                <li>
                  <strong className="text-slate-200">Advertising (optional):</strong>{" "}
                  if we display third-party ads, partners may set cookies to
                  measure delivery and relevance. Ad slots may be introduced
                  incrementally on the site.
                </li>
              </ul>
            </>
          ),
        },
        {
          title: "Managing cookies",
          content: (
            <p>
              You can control cookies through your browser settings. Blocking
              essential cookies may affect site functionality. For EEA/UK users,
              we will provide consent controls if non-essential cookies or ads
              are activated.
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
                className="text-violet-200/90 hover:text-white"
              >
                Privacy Policy
              </Link>
              . Questions?{" "}
              <Link
                href={APP_ROUTES.contact}
                className="text-violet-200/90 hover:text-white"
              >
                Contact us
              </Link>
              .
            </p>
          ),
        },
      ]}
    />
  );
}
