import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";
import { SITE_FAQ_ITEMS } from "@/lib/siteFaq";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers about StatusTimer game server monitoring, social platform status, release countdowns, data sources, and accuracy.",
};

export default function FaqPage() {
  return (
    <PageShell
      badge="Support"
      title="Frequently Asked Questions"
      subtitle="Common questions about game monitoring, social platform checks, releases, and data accuracy."
    >
      <div className="space-y-3">
        {SITE_FAQ_ITEMS.map((item) => (
          <details
            key={item.question}
            className="glass-panel rounded-2xl px-5 py-4"
          >
            <summary className="cursor-pointer text-sm font-medium text-white">
              {item.question}
            </summary>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              {item.answer}
            </p>
          </details>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-slate-400">
        Still need help?{" "}
        <Link
          href={APP_ROUTES.contact}
          className="text-violet-200/90 transition hover:text-white"
        >
          Get in touch
        </Link>
        .
      </p>
    </PageShell>
  );
}
