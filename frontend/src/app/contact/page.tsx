import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";
import { CONTACT_EMAIL, resolveContactMailto } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact StatusTimer for support, corrections, or general inquiries.",
};

export default function ContactPage() {
  const mailto = resolveContactMailto();

  return (
    <PageShell
      badge="Support"
      title="Contact"
      subtitle="Questions, corrections, or feedback about StatusTimer."
    >
      <section className="glass-panel mx-auto max-w-2xl rounded-2xl p-6 md:p-8">
        <div className="mb-4 inline-flex rounded-xl border border-violet-400/20 bg-violet-500/10 p-2.5">
          <Mail className="h-5 w-5 text-violet-300" />
        </div>

        {mailto ? (
          <>
            <p className="text-sm leading-7 text-slate-300">
              For support, data corrections, or general inquiries, email us at:
            </p>
            <a
              href={mailto}
              className="mt-4 inline-flex text-lg font-medium text-violet-200 transition hover:text-white"
            >
              {CONTACT_EMAIL}
            </a>
            <p className="mt-6 text-sm leading-7 text-slate-400">
              Please include the game name, page URL, and a short description of
              your question. We aim to respond as soon as possible.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm leading-7 text-slate-300">
              We are setting up our public contact address. Please check back
              soon or review the{" "}
              <Link
                href={APP_ROUTES.faq}
                className="text-violet-200/90 transition hover:text-white"
              >
                FAQ
              </Link>{" "}
              in the meantime.
            </p>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              When available, contact will be published here and in the site
              footer. Site operators can enable it with the{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-slate-300">
                NEXT_PUBLIC_CONTACT_EMAIL
              </code>{" "}
              environment variable.
            </p>
          </>
        )}
      </section>
    </PageShell>
  );
}
