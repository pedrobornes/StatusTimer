import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Database, Newspaper, Shield } from "lucide-react";
import PageShell from "@/components/PageShell";
import { APP_ROUTES } from "@/config/routes";
import { MONITORED_SOCIAL_PLATFORMS_TEXT } from "@/config/seo";

export const metadata: Metadata = {
  title: "How StatusTimer Works",
  description:
    "Learn how StatusTimer monitors game servers and social platforms, aggregates public data, and presents per-game status, patch notes, and updates.",
};

const STEPS = [
  {
    icon: Database,
    title: "Public data sources",
    body:
      "We combine publicly available information: official publisher status pages, player and audience figures where available, game metadata, and official news from supported titles.",
  },
  {
    icon: Activity,
    title: "Scheduled monitoring",
    body:
      `Games in our catalog are checked on a recurring schedule and labeled online, down, or maintenance. We also check connectivity for ${MONITORED_SOCIAL_PLATFORMS_TEXT}. Each page shows when data was last refreshed.`,
  },
  {
    icon: Newspaper,
    title: "Per-game news",
    body:
      "Patch notes and updates from official publisher channels appear on that game's status page — not pulled from forums or social media, and not mixed into a single global feed.",
  },
  {
    icon: Shield,
    title: "Independent & informational",
    body:
      "StatusTimer is not affiliated with publishers or platforms. Status labels reflect our monitored signals and are provided for informational purposes only.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <PageShell
      badge="Guide"
      title="How StatusTimer works"
      subtitle="A clear overview of what we track, how often we update, and what our status labels mean."
    >
      <div className="grid gap-5 md:grid-cols-2">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="glass-panel rounded-2xl p-6 md:p-8"
          >
            <div className="mb-4 inline-flex rounded-xl border border-violet-400/20 bg-violet-500/10 p-2.5">
              <Icon className="h-5 w-5 text-violet-300" />
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
          </article>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-slate-400">
        More questions? See our{" "}
        <Link
          href={APP_ROUTES.faq}
          className="text-violet-200/90 transition hover:text-white"
        >
          FAQ
        </Link>{" "}
        or{" "}
        <Link
          href={APP_ROUTES.contact}
          className="text-violet-200/90 transition hover:text-white"
        >
          contact us
        </Link>
        .
      </p>
    </PageShell>
  );
}
