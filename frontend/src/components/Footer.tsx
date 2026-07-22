import Link from "next/link";
import { Scale } from "lucide-react";
import { APP_ROUTES } from "@/config/routes";
import { TRADEMARK_FOOTER_NOTICE } from "@/config/legal";
import { CONTACT_EMAIL, KOFI_URL, SITE_NAME } from "@/config/site";

const PRODUCT_LINKS = [
  { href: APP_ROUTES.home, label: "Monitor" },
  { href: APP_ROUTES.games, label: "Games" },
  { href: APP_ROUTES.releases, label: "Game Releases" },
  { href: APP_ROUTES.howItWorks, label: "How it works" },
] as const;

const SUPPORT_LINKS = [
  { href: APP_ROUTES.faq, label: "FAQ" },
  { href: APP_ROUTES.contact, label: "Contact" },
  { href: KOFI_URL, label: "Support on Ko-fi", external: true },
] as const;

const LEGAL_LINKS = [
  { href: APP_ROUTES.legalNotice, label: "Legal Notice" },
  { href: APP_ROUTES.privacy, label: "Privacy Policy" },
  { href: APP_ROUTES.terms, label: "Terms of Service" },
  { href: APP_ROUTES.cookies, label: "Cookie Policy" },
] as const;

type FooterLink = {
  href: string;
  label: string;
  external?: boolean;
};

function FooterLinkGroup({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<FooterLink>;
}) {
  return (
    <div>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-200/70">
        {title}
      </p>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            {link.external ? (
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="text-sm text-slate-400 transition hover:text-white"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-violet-400/10 bg-black/20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10 md:px-8">
        <div className="glass-panel rounded-2xl p-5 sm:p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <p className="text-sm font-bold tracking-wide text-white">
                {SITE_NAME}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Independent live game server monitoring, social platform
                connectivity checks, release tracking, and game-specific updates.
              </p>
            </div>

            <FooterLinkGroup title="Product" links={PRODUCT_LINKS} />
            <FooterLinkGroup title="Support" links={SUPPORT_LINKS} />
            <FooterLinkGroup title="Legal" links={LEGAL_LINKS} />
          </div>

          <div className="mt-8 border-t border-white/5 pt-6">
            <div className="mb-4 flex items-center gap-2">
              <Scale className="h-4 w-4 shrink-0 text-violet-300/80" />
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-violet-200/70">
                Trademark notice
              </p>
            </div>

            <p className="text-sm leading-relaxed text-slate-400">
              {TRADEMARK_FOOTER_NOTICE}{" "}
              <Link
                href={`${APP_ROUTES.terms}#trademarks`}
                className="text-violet-200/90 transition hover:text-white"
              >
                Read the full trademark notice
              </Link>
              .
            </p>

            {CONTACT_EMAIL ? (
              <p className="mt-4 text-sm text-slate-400">
                Contact:{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-violet-200/90 transition hover:text-white"
                >
                  {CONTACT_EMAIL}
                </a>
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-col gap-2 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              &copy; {currentYear} {SITE_NAME}. All rights reserved.
            </p>
            <p className="text-xs text-slate-500">
              Informational purposes only. Not official outage confirmation.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
